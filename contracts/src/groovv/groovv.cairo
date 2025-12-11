#[starknet::contract]
pub mod Groovv {
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc1155::{ERC1155Component, ERC1155HooksEmptyImpl};
    use openzeppelin::upgrades::UpgradeableComponent;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    use starknet::storage::{
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess,
        StoragePointerWriteAccess, VecTrait
    };
    use starknet::{get_caller_address, ContractAddress,ClassHash};
    use crate::groovv::events::{GroovyEvents};
    use crate::groovv::interface::*;

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
        songs: Map<u256, SongNode>,  
        albums: Map<u256, AlbumNode>, 
        listings: Map<u256, ListingNode>, // sosng id to price mapping
        song_id_counter:u256,
        album_id_counter: u256,
        listing_id_counter:u256,
        accepted_tokens: Map<felt252, ContractAddress>, // address of the STRK token contract
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        GroovyEvents: GroovyEvents,
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
        pub const NOT_SONG_ARTIST: felt252 = 'You are not the song artist';
    }


    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token_uri: ByteArray, usdc_address: ContractAddress) {
        self.ownable.initializer(owner);
        self.erc1155.initializer(token_uri);
        self.song_id_counter.write(0);
        self.listing_id_counter.write(0);
        self.accepted_tokens.entry('USDC').write(usdc_address);
    }


    #[abi(embed_v0)]
    pub impl GroovvImpl of IGroovv<ContractState> {
        // mints the song and creates a listing of it automatically
        fn mint_song(ref self: ContractState, song: Song, price: u256, copies: u256, token_uri: ByteArray) {
            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
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
            .batch_mint_with_acceptance_check(caller,array![song_id].span(), array![copies].span(), array![].span());

            // let listing_id: u256 = self.listing_id_counter.read() + 1;

            // let listing = self.listings.entry(listing_id);

            // listing.seller.write(caller);
            // listing.price.write(price);
            // listing.song_id.write(song_id);
            // listing.copies.write(copies);
            // self.listing_id_counter.write(listing_id);
        }

        fn update_song_price(ref self: ContractState, id: u256, new_price: u256) {
            let caller: ContractAddress = get_caller_address();
            let listing = self.listings.entry(id);
            let seller = listing.seller.read();
            assert(caller == seller, GroovErrors::NOT_SONG_OWNER);

            listing.price.write(new_price);
        }

        fn get_song(self: @ContractState, id: u256) -> Song {
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

        fn buy_song(ref self: ContractState, id: u256, copies: u256, tip: u256) {
            let caller = get_caller_address();
            let listing = self.listings.entry(id);
            let price = listing.price.read();
            let seller = listing.seller.read();
            let strk_token = IERC20Dispatcher { contract_address: self.accepted_tokens.entry('USDC').read() };

            let total_cost = price * copies + tip;
            let buyer_balance = strk_token.balance_of(caller);

            assert(copies > 0, GroovErrors::INSUFFICIENT_COPIES);
            assert(buyer_balance >= total_cost, GroovErrors::INSUFFICIENT_FUNDS);
            assert(copies <= listing.copies.read(), GroovErrors::INSUFFICIENT_COPIES);
            assert(self.songs.entry(listing.song_id.read()).releaseDate.read() != 0, GroovErrors::SONG_NOT_FOUND);

            // strk_token.approve(caller, total_cost);
            strk_token.transfer_from(caller, seller, total_cost);
            self.erc1155.safe_transfer_from(seller, caller, listing.song_id.read(), copies, array![].span());
            let remaining_copies = listing.copies.read() - copies;

            if remaining_copies == 0 {
                listing.seller.write(''.try_into().unwrap());
                listing.price.write(0.try_into().unwrap());
                listing.song_id.write(0.try_into().unwrap());
            }

            listing.copies.write(remaining_copies);
        }

        fn list_song(ref self: ContractState, song_id: u256, price: u256, copies: u256) {
            let caller  = get_caller_address();
            let song = self.songs.entry(song_id);
            assert(song.releaseDate.read() != 0, GroovErrors::SONG_NOT_FOUND);
            let seller_song_balance = self.erc1155.balance_of(caller, song_id);
            assert(seller_song_balance >= copies, GroovErrors::SONG_NOT_OWNED);

            let listing_id: u256 = self.listing_id_counter.read() + 1;

            let listing = self.listings.entry(listing_id);

            listing.seller.write(caller);
            listing.price.write(price);  
            listing.song_id.write(song_id);
            listing.copies.write(copies);

            self.listing_id_counter.write(listing_id);
            
        }

        fn create_album(ref self: ContractState, album: Album) {
            let caller  = get_caller_address();
            assert(album.artist == caller, GroovErrors::NOT_SONG_OWNER);
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
                let song = self.songs.entry(song_id);
                assert(song_id != 0, GroovErrors::SONG_NOT_FOUND);
                assert(song.artist.read() == caller, GroovErrors::NOT_SONG_ARTIST);

                album_node.songs.push(song_id);
            }

            self.album_id_counter.write(album_id);

        }

        fn add_song_to_album(ref self: ContractState, album_id: u256, song_id: u256) {
            let caller  = get_caller_address();
            let album = self.albums.entry(album_id);
            let song = self.songs.entry(song_id);

            assert(album.artist.read() == caller, GroovErrors::NOT_SONG_OWNER);
            assert(song_id != 0, GroovErrors::SONG_NOT_FOUND);
            assert(song.artist.read() == caller, GroovErrors::NOT_SONG_ARTIST);

            album.songs.push(song_id);
        }

        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            // This function can only be called by the owner
            self.ownable.assert_only_owner();

            // Replace the class hash upgrading the contract
            self.upgradeable.upgrade(new_class_hash);
        }
    }
}   