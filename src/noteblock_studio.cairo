#[starknet::interface]
trait INBStudio<TContractState> {
    // Song functions

    // Creates a song
    // Adds the song to a mapping of ids to songs
    // Event is emitted for the created song
    // Ensure only Studio Owner can create a song
    // Song is sent to the studio contract
    fn mintSong(ref self: TContractState, song: Song);

    // Creates an album - list of songs
    // Adds each song in an album to the mapping of ids to songs
    // Adds album to a mapping of ids to albums
    // Event is emitted for the created album
    // Ensure only Studio Owner can create an album
    // Song is sent to the studio contract
    fn mintAlbum(ref self: TContractState, album: Album);

    // Gets a song at id
    // Returns the song from the mapping of ids to songs
    fn getSong(self: @TContractState, id: u256) -> Song;

    // Edits a song at id 
    // Updates the song in the mapping of ids to songs
    // Event is emitted for the edited song
    // Ensure only Studio Owner can edit a song
    fn editSong(ref self: TContractState, id: u256, song: Song);

    // Gets an album at id
    // Returns the album from the mapping of ids to albums
    fn getAlbum(self: @TContractState, id: u256) -> Album;

    // Edits an album at id
    // Updates the album in the mapping of ids to albums
    // Event is emitted for the edited album
    // Ensure only Studio Owner can edit an album
    fn editAlbum(ref self: TContractState, id: u256, album: Album);

    // Allows user to buy a song in the form of an nft used as an access key to the song stored in NBs storage vault
    fn buySong(ref self: TContractState, id: u256, tip: u256);

    // Allows user to buy an album in the form of an nft used as an access key to the album stored in NBs storage vault
    // Cheaper to buy an album than a song on average
    fn buyAlbum(ref self: TContractState, id: u256, tip: u256);
}


#[starknet::contract]
pub mod NBStudio {
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, StoragePathEntry, Vec, VecTrait, MutableVecTrait, ByteArray
    };
    use core::starknet::{ContractAddress, get_caller_address};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_utils::interfaces::{IUniversalDeployerDispatcher, IUniversalDeployerDispatcherTrait};
    use openzeppelin_utils::serde::SerializedAppend;
    use noteblock::Noteblock::StudioData;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        // mapping of ids to songs
        songs: Map<u256, Song>,
        // Mapping of album names to vec of song ids
        albums: Map<ByteArray, Vec<u256>>
        studio_data: StudioData,
    }


    #[starknet:storage_node]
    struct Song {
        artist: ContractAddress,
        name: ByteArray,
        genre: ByteArray,
        amount: u256,
        royaltyAddresses: Vec<ContractAddress>,
        royaltyAmount: Vec<u256>,
        length: u256,
        releaseDate: u256,
        CID: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, studio_data: StudioData) {
        self.ownable.initializer(owner);
        self.studio_data.write(studio_data);
    }

    #[abi(embed_v0)]
    impl NBStudioImpl of super::INBStudio<ContractState> {
        
    }


}