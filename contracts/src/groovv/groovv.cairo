#[starknet::contract]
pub mod Groovv {
    use core::num::traits::Zero;
    use crate::groovv::interface::SongNode;
    use crate::groovv::interface::Song;
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc1155::{ERC1155Component, ERC1155HooksEmptyImpl};
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    use starknet::storage::{
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess,
        StoragePointerWriteAccess, VecTrait
    };
    use starknet::{get_caller_address, get_contract_address, ContractAddress, ClassHash};
    use crate::groovv::events::{
        AlbumCreated, FundsWithdrawn, GroovvEvents, ListingCreated, ListingPurchased,
        ListingRemoved, SongCreated, SongUpdated,
    };
    use crate::groovv::interface::*;
    use alexandria_math::fast_root::{fast_sqrt};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);
    component!(path: ERC1155Component, storage: erc1155, event: ERC1155Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;
    impl ERC1155MixinImpl = ERC1155Component::ERC1155MixinImpl<ContractState>;
    impl ERC1155InternalImpl = ERC1155Component::InternalImpl<ContractState>;


    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        #[substorage(v0)]
        erc1155: ERC1155Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        artists: Map<ContractAddress, u128>,
        songs: Map<u256, SongNode>,  
        albums: Map<u256, AlbumNode>, 
        listings: Map<u256, ListingNode>, // song id to price mapping
        song_id_counter:u256,
        album_id_counter: u256,
        listing_id_counter:u256,
        ratio_bps: u16,
        accepted_tokens: Map<felt252, ContractAddress>, // address of the STRK token contract
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        GroovvEvents: GroovvEvents,
        #[flat]
        ERC1155Event: ERC1155Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event
    }

    pub mod GroovErrors {
        pub const NOT_SONG_OWNER: felt252 = 'You are not the song owner';
        pub const SONG_NOT_OWNED: felt252 = 'You do not own this song';
        pub const INSUFFICIENT_FUNDS: felt252 = 'You have insufficient funds';
        pub const INSUFFICIENT_COPIES: felt252 = 'You have insufficient copies';
        pub const SONG_NOT_FOUND: felt252 = 'This song does not exist';
        pub const SONG_ALREADY_EXISTS: felt252 = 'This song exist already exists';
        pub const SONG_ALREADY_IN_ALBUM: felt252 = 'Song already in album';
        pub const ALBUM_NOT_FOUND: felt252 = 'This album does not exist';
        pub const NOT_SONG_ARTIST: felt252 = 'You are not the song artist';
        pub const LISTING_NOT_FOUND: felt252 = 'This listing does not exist';
        pub const INVALID_PRICE: felt252 = 'Price must be greater than zero';
        pub const PRICE_CHANGED: felt252 = 'Listing price changed';
        pub const PAYMENT_FAILED: felt252 = 'Payment transfer failed';
        pub const INVALID_RATIO: felt252 = 'Ratio must be 0.10 to 0.99';
        pub const INVALID_TOKEN_ADDRESS: felt252 = 'Token addr cannot be zero';
        pub const INVALID_ADDRESS: felt252 = 'Address cannot be zero';
        pub const INVALID_AMOUNT: felt252 = 'Amount must be > 0';
    }

    const BPS_DENOMINATOR: u256 = 10000;
    const SECONDARY_ROYALTY_BPS: u256 = 1000; // 10%
    const RATIO_SCALE: u128 = 10000;
    const RATIO_MIN_BPS: u16 = 1000; // 0.10
    const RATIO_MAX_BPS: u16 = 9900; // 0.99
    const DEFAULT_RATIO_BPS: u16 = 3000; // 0.50
    const RATIO_MIN_HUNDREDTHS: u16 = 10; // 0.10
    const RATIO_MAX_HUNDREDTHS: u16 = 99; // 0.99
    const ITER: u32 = 100; // 0.99



    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token_uri: ByteArray, usdc_address: ContractAddress) {
        assert(usdc_address.is_non_zero(), GroovErrors::INVALID_TOKEN_ADDRESS);
        self.ownable.initializer(owner);
        self.erc1155.initializer(token_uri);
        self.song_id_counter.write(0);
        self.album_id_counter.write(0);
        self.listing_id_counter.write(0);
        self.accepted_tokens.entry('USDC').write(usdc_address);
        self.ratio_bps.write(DEFAULT_RATIO_BPS);
    }


    #[abi(embed_v0)]
    pub impl GroovvImpl of IGroovv<ContractState> {
        // mints the song and creates a listing of it automatically
        fn mint_song(ref self: ContractState, song: Song, price: u128, copies: u128) {
            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
            assert(price > 0, GroovErrors::INVALID_PRICE);
            let caller  = get_caller_address();
            let counter: u256 = self.song_id_counter.read();
            let song_id:u256 = counter + 1;
            let song_node = self.songs.entry(song_id);

            song_node.name.write(song.name);
            song_node.artist.write(caller);
            song_node.genre.write(song.genre);
            song_node.length.write(song.length);
            song_node.releaseDate.write(song.releaseDate);
            song_node.CID.write(song.CID);

            for i in 0..song.feat.len() {
                let feat_address = song.feat.at(i).clone();
                song_node.feat.push(feat_address);
            }

            self.song_id_counter.write(song_id);

            self
            .erc1155
            .batch_mint_with_acceptance_check(caller,array![song_id].span(), array![copies.try_into().unwrap()].span(), array![].span());

            // Escrow the initial listed supply in the contract.
            self
                .erc1155
                .update(caller, get_contract_address(), array![song_id].span(), array![copies.try_into().unwrap()].span());

            let listing_id: u256 = self.listing_id_counter.read() + 1;

            let listing = self.listings.entry(listing_id);

            listing.seller.write(caller);
            listing.price.write(price.try_into().unwrap());
            listing.song_id.write(song_id);
            listing.copies.write(copies.try_into().unwrap());
            self.listing_id_counter.write(listing_id);

            let mut current_count = self.artists.entry(caller).read();

            if (current_count == 0 ) {
                self.artists.entry(caller).write(0);
            } else {
                current_count = self.artists.entry(caller).read();
            }
            let new_count: u128 = current_count + 1;
             
            self.artists.entry(caller).write(new_count);

            // Pay fee
            let cost = self._generate_quote(copies);
            let payment_token = IERC20Dispatcher {
                contract_address: self.accepted_tokens.entry('USDC').read(),
            };

            let buyer_balance = payment_token.balance_of(caller);
            assert(buyer_balance >= cost, GroovErrors::INSUFFICIENT_FUNDS);
            let seller_transfer_success = payment_token.transfer_from(caller, get_contract_address(), cost);
            assert(seller_transfer_success, GroovErrors::PAYMENT_FAILED);

            self.emit(
                GroovvEvents::SongCreated(
                    SongCreated {
                        song_id,
                        artist: caller,
                        name: song_node.name.read(),
                        genre: song_node.genre.read(),
                        length: song_node.length.read(),
                        release_date: song_node.releaseDate.read(),
                        cid: song_node.CID.read(),
                    }
                )
            );

            let copies: u256 = copies.try_into().unwrap();
            let price: u256 = price.try_into().unwrap();


            self.emit(
                GroovvEvents::ListingCreated(
                    ListingCreated {
                        seller: caller,
                        listing_id,
                        song_id,
                        price,
                        copies,
                    }
                )
            );
        }

        fn update_song_price(ref self: ContractState, id: u256, new_price: u256) {
            assert(new_price > 0, GroovErrors::INVALID_PRICE);
            let caller: ContractAddress = get_caller_address();
            let listing = self.listings.entry(id);
            assert(listing.song_id.read() != 0, GroovErrors::LISTING_NOT_FOUND);
            let seller = listing.seller.read();
            assert(caller == seller, GroovErrors::NOT_SONG_OWNER);

            listing.price.write(new_price);

            self.emit(
                GroovvEvents::SongUpdated(
                    SongUpdated { listing_id: id, seller: caller, new_price }
                )
            );
        }

        fn get_song(self: @ContractState, id: u256) -> Song {
            self._assert_song_exists(id);
            let song = self.songs.entry(id);
            let song_return = Song {
                name: song.name.read(),
                artist: song.artist.read(),
                genre: song.genre.read(),
                length: song.length.read(),
                releaseDate: song.releaseDate.read(),
                feat: {          
                        let mut feat = array![];
                        for i in 0..song.feat.len() {
                            let mut feat_address = song.feat.at(i).read().clone();
                            feat.append(feat_address);
                        }
                        feat
                },
                CID: song.CID.read()
            };

            return song_return;
        }

        fn get_listing(self: @ContractState, id: u256) -> Listing {
            let listing = self.listings.entry(id);
            let song_id = listing.song_id.read();
            assert(song_id != 0, GroovErrors::LISTING_NOT_FOUND);

            Listing {
                seller: listing.seller.read(),
                song_id,
                price: listing.price.read(),
                copies: listing.copies.read(),
            }
        }

        fn get_song_balance(
            self: @ContractState, owner: ContractAddress, song_id: u256
        ) -> u256 {
            self._assert_song_exists(song_id);
            self.erc1155.balance_of(owner, song_id)
        }

        fn buy_song(ref self: ContractState, id: u256, expected_price: u256, copies: u256, tip: u256) {
            let caller = get_caller_address();
            let listing = self.listings.entry(id);
            assert(listing.song_id.read() != 0, GroovErrors::LISTING_NOT_FOUND);
            let price = listing.price.read();
            assert(expected_price == price, GroovErrors::PRICE_CHANGED);
            let seller = listing.seller.read();
            let listed_copies = listing.copies.read();
            let payment_token = IERC20Dispatcher {
                contract_address: self.accepted_tokens.entry('USDC').read(),
            };
            let song_id = listing.song_id.read();
            self._assert_song_exists(song_id);
            let song = self.songs.entry(song_id);

            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
            assert(copies <= listed_copies, GroovErrors::INSUFFICIENT_COPIES);

            let listing_subtotal = price * copies;
            let total_cost = listing_subtotal + tip;
            let buyer_balance = payment_token.balance_of(caller);
            assert(buyer_balance >= total_cost, GroovErrors::INSUFFICIENT_FUNDS);

            let artist = song.artist.read();
            let artist_royalty = if seller != artist {
                listing_subtotal * SECONDARY_ROYALTY_BPS / BPS_DENOMINATOR
            } else {
                0
            };
            let seller_proceeds = total_cost - artist_royalty;
            let remaining_copies = listed_copies - copies;

            if remaining_copies == 0 {
                listing.seller.write(''.try_into().unwrap());
                listing.price.write(0.try_into().unwrap());
                listing.song_id.write(0.try_into().unwrap());
                listing.copies.write(0.try_into().unwrap());
            } else {
                listing.copies.write(remaining_copies);
            }

            if artist_royalty > 0 {
                let royalty_transfer_success = payment_token.transfer_from(
                    caller, artist, artist_royalty,
                );
                assert(royalty_transfer_success, GroovErrors::PAYMENT_FAILED);
            }

            let seller_transfer_success = payment_token.transfer_from(caller, seller, seller_proceeds);
            assert(seller_transfer_success, GroovErrors::PAYMENT_FAILED);

            // Use the internal ERC1155 transfer path because listed copies are escrowed in this contract.
            self
                .erc1155
                .update_with_acceptance_check(
                    get_contract_address(),
                    caller,
                    array![song_id].span(),
                    array![copies].span(),
                    array![].span(),
                );

            self.emit(
                GroovvEvents::ListingPurchased(
                    ListingPurchased {
                        buyer: caller,
                        seller,
                        listing_id: id,
                        song_id,
                        price,
                        copies,
                        total_cost,
                    }
                )
            );
        }

        fn list_song(ref self: ContractState, song_id: u256, price: u256, copies: u256) {
            let caller  = get_caller_address();
            self._assert_song_exists(song_id);
            assert(price > 0, GroovErrors::INVALID_PRICE);
            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
            let seller_song_balance = self.erc1155.balance_of(caller, song_id);
            assert(seller_song_balance >= copies, GroovErrors::SONG_NOT_OWNED);

            // Escrow listed copies in the contract to avoid double-listing the same balance.
            self
                .erc1155
                .update(caller, get_contract_address(), array![song_id].span(), array![copies].span());

            let listing_id: u256 = self.listing_id_counter.read() + 1;

            let listing = self.listings.entry(listing_id);

            listing.seller.write(caller);
            listing.price.write(price);  
            listing.song_id.write(song_id);
            listing.copies.write(copies);

            self.listing_id_counter.write(listing_id);

            self.emit(
                GroovvEvents::ListingCreated(
                    ListingCreated { seller: caller, listing_id, song_id, price, copies }
                )
            );
        }

        fn remove_listing(ref self: ContractState, id: u256, copies: u256) {
            let caller = get_caller_address();
            let listing = self.listings.entry(id);
            let song_id = listing.song_id.read();
            assert(song_id != 0, GroovErrors::LISTING_NOT_FOUND);
            let seller = listing.seller.read();
            assert(caller == seller, GroovErrors::NOT_SONG_OWNER);
            let listed_copies = listing.copies.read();
            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
            assert(copies <= listed_copies, GroovErrors::INSUFFICIENT_COPIES);
            let remaining_copies = listed_copies - copies;

            // Update listing state before external interactions.
            if remaining_copies == 0 {
                listing.seller.write(''.try_into().unwrap());
                listing.price.write(0.try_into().unwrap());
                listing.song_id.write(0.try_into().unwrap());
                listing.copies.write(0.try_into().unwrap());
            } else {
                listing.copies.write(remaining_copies);
            }

            // Return removed escrowed copies to the seller.
            self
                .erc1155
                .update_with_acceptance_check(
                    get_contract_address(),
                    seller,
                    array![song_id].span(),
                    array![copies].span(),
                    array![].span(),
                );

            self.emit(
                GroovvEvents::ListingRemoved(
                    ListingRemoved {
                        seller,
                        listing_id: id,
                        song_id,
                        removed_copies: copies,
                        remaining_copies,
                    }
                )
            );
        }

        fn create_album(ref self: ContractState, album: Album) {
            let caller  = get_caller_address();
            assert(album.artist == caller, GroovErrors::NOT_SONG_OWNER);
            assert(album.songs.len() > 0, GroovErrors::SONG_NOT_FOUND);
            // Further implementation needed to store albums
            let counter: u256 = self.album_id_counter.read();
            let album_id:u256 = counter + 1;
            let album_node = self.albums.entry(album_id);
            album_node.name.write(album.name);
            album_node.artist.write(album.artist);
            album_node.genre.write(album.genre);
            album_node.releaseDate.write(album.releaseDate);

            for i in 0..album.songs.len() {
                let song_id = album.songs.at(i).clone();
                self._assert_song_exists(song_id);
                let song = self.songs.entry(song_id);
                assert(song.artist.read() == caller, GroovErrors::NOT_SONG_ARTIST);
                self._assert_song_is_not_in_album(album_id, song_id);
                album_node.songs.push(song_id);
            }

            self.album_id_counter.write(album_id);

            self.emit(
                GroovvEvents::AlbumCreated(
                    AlbumCreated {
                        album_id,
                        artist: caller,
                        name: album_node.name.read(),
                        genre: album_node.genre.read(),
                        release_date: album_node.releaseDate.read(),
                        songs_count: album_node.songs.len().try_into().unwrap(),
                    }
                )
            );

        }

        fn add_song_to_album(ref self: ContractState, album_id: u256, song_id: u256) {
            let caller  = get_caller_address();
            let album = self.albums.entry(album_id);
            self._assert_song_exists(song_id);
            let song = self.songs.entry(song_id);
            self._assert_album_exists(album_id);
            assert(album.artist.read() == caller, GroovErrors::NOT_SONG_OWNER);
            assert(song.artist.read() == caller, GroovErrors::NOT_SONG_ARTIST);
            // album doesnt have song
            self._assert_song_is_not_in_album(album_id, song_id);
            album.songs.push(song_id);
        }

        fn set_ratio_hundredths(ref self: ContractState, ratio_hundredths: u16) {
            self.ownable.assert_only_owner();
            assert(ratio_hundredths >= RATIO_MIN_HUNDREDTHS, GroovErrors::INVALID_RATIO);
            assert(ratio_hundredths <= RATIO_MAX_HUNDREDTHS, GroovErrors::INVALID_RATIO);
            let ratio_bps: u16 = ratio_hundredths * 100;
            assert(ratio_bps >= RATIO_MIN_BPS, GroovErrors::INVALID_RATIO);
            assert(ratio_bps <= RATIO_MAX_BPS, GroovErrors::INVALID_RATIO);
            self.ratio_bps.write(ratio_bps);
        }

        fn get_ratio_hundredths(self: @ContractState) -> u16 {
            self.ratio_bps.read() / 100
        }

        fn withdraw_funds(ref self: ContractState, to: ContractAddress, amount: u256) {
            self.ownable.assert_only_owner();
            assert(to.is_non_zero(), GroovErrors::INVALID_ADDRESS);
            assert(amount > 0, GroovErrors::INVALID_AMOUNT);

            let payment_token = IERC20Dispatcher {
                contract_address: self.accepted_tokens.entry('USDC').read(),
            };
            let transfer_success = payment_token.transfer(to, amount);
            assert(transfer_success, GroovErrors::PAYMENT_FAILED);

            self.emit(
                GroovvEvents::FundsWithdrawn(
                    FundsWithdrawn { owner: get_caller_address(), recipient: to, amount }
                )
            );
        }

        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            // This function can only be called by the owner
            self.ownable.assert_only_owner();

            // Replace the class hash upgrading the contract
            self.upgradeable.upgrade(new_class_hash);
        }
    }

        // Could be a group of functions about a same topic
    #[generate_trait]
    pub impl InternalGroovvImpl of InternalGroovvTrait {
        fn _song_exists(self: @ContractState, id: u256) -> bool {
            if id == 0 {
                return false;
            };
            if id > self.song_id_counter.read() {
                return false;
            };

            let song = self.songs.entry(id);
            return song.artist.read().is_non_zero();
        }

        fn _assert_song_exists(self: @ContractState, id: u256) {
            assert(self._song_exists(id), GroovErrors::SONG_NOT_FOUND);
        }

        fn _album_exists(self: @ContractState, id: u256) -> bool {
            if id == 0 {
                return false;
            };
            if id > self.album_id_counter.read() {
                return false;
            };

            let album = self.albums.entry(id);
            return album.artist.read().is_non_zero();
        }

        fn _assert_album_exists(self: @ContractState, id: u256) {
            assert(self._album_exists(id), GroovErrors::ALBUM_NOT_FOUND);
        }

        fn _get_number_of_mints(self: @ContractState) -> u128 {
            let caller: ContractAddress = get_caller_address();
            let mints = self.artists.entry(caller).read();
            return mints;
        }

        fn _calculate_fees(self: @ContractState, copies: u128, mints: u128) -> u128 {
            let ratio_bps: u128 = self.ratio_bps.read().into();
            let mint_factor = mints;
            let sqrt1 = fast_sqrt(copies * mint_factor * mint_factor, ITER);
            let sqrt2 = fast_sqrt(1 + sqrt1, ITER);
            let ratio_component = ratio_bps * sqrt2 / RATIO_SCALE;
            let price = mints + ratio_component;
            
            return price;
        }

        fn _generate_quote(self: @ContractState, copies: u128) -> u256 {

            let mints = self._get_number_of_mints();

            let fees: u256 = self._calculate_fees(copies, mints).try_into().unwrap();

            return fees;
        }

        fn _assert_song_is_not_in_album(self: @ContractState, album_id: u256, song_id: u256) {
            let album = self.albums.entry(album_id);
            let song_count: u64 = album.songs.len();
            for i in 0_u64..song_count {
                let existing_song_id = album.songs.at(i).read();
                assert(existing_song_id != song_id, GroovErrors::SONG_ALREADY_IN_ALBUM);
            }
        }
    }

}   
