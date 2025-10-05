#[starknet::contract]
pub mod Groovy {
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::introspection::src5::SRC5Component;
    use openzeppelin::token::erc1155::{ERC1155Component, ERC1155HooksEmptyImpl};
    use openzeppelin::utils::interfaces::{IUniversalDeployerDispatcher, IUniversalDeployerDispatcherTrait,};
    use openzeppelin::upgrades::UpgradeableComponent;
    

    use starknet::storage::{
        Map, MutableVecTrait, StorageMapReadAccess, StoragePathEntry, StoragePointerReadAccess,
        StoragePointerWriteAccess, Vec, VecTrait,
    };
    use starknet::{get_caller_address};

    use crate::groovy::interface::{IGroovy, Song, SongNode};
    use crate::groovy::events::{GroovyEvent, SongCreated, SongUpdated};

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
        erc1155: ERC1155Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        songs: Map<u256, SongNode>,   
        listings: Map<u64, u256>, // song id to price mapping
        song_id_counter:u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        GroovyEvent: GroovyEvent,
        #[flat]
        ERC1155Event: ERC1155Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event
    }

    pub mod Errors {
        pub const NOT_SONG_OWNER: felt252 = 'You are not the song owner';
        pub const INSUFFICIENT_FUNDS: felt252 = 'You have insufficient funds';
    }


    #[constructor]
    fn constructor(ref self: ContractState) {
        let caller = get_caller_address();
        self.ownable.initializer(caller);
    }


    #[abi(embed_v0)]
    impl GroovyImpl of IGroovy<ContractState> {
        fn mint_song(ref self: ContractState, song: Song, copies: u256) {
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

            self.erc1155.initializer(token_uri);
            self
            .erc1155
            .batch_mint_with_acceptance_check(caller, token_ids, values, array![].span());
        }

        fn mint_more_copies(ref self: ContractState, id: u256, copies: u256) {
            // let caller  = get_caller_address();

            // let song = self.songs.get(id);

            // assert(caller == song.artist, Errors::NOT_SONG_OWNER);

            // self.erc1155.mint(caller, id, copies, []);
        }
    }

    // #[abi(embed_v0)]
    // impl UpgradeableImpl of IUpgradeable<ContractState> {
    //     fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
    //         // This function can only be called by the owner
    //         self.ownable.assert_only_owner();
    //         // Replace the class hash upgrading the contract
    //         self.upgradeable.upgrade(new_class_hash);
    //     }
    // }
}   