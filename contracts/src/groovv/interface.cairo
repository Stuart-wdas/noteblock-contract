use starknet::{ContractAddress, ClassHash};
use starknet::storage::Vec;

#[derive(Drop, Clone, Serde)]
pub struct Song {
    pub name: ByteArray,
    pub artist: ContractAddress,
    pub genre: ByteArray,
    pub length: u256,
    pub releaseDate: u256,
    pub feat: Array<ContractAddress>,
    pub CID: felt252
}

#[starknet::storage_node]
pub struct SongNode {
    pub name: ByteArray,
    pub artist: ContractAddress,
    pub genre: ByteArray,
    pub length: u256,
    pub releaseDate: u256,
    pub feat: Vec<ContractAddress>,
    pub CID: felt252,
}

#[derive(Drop, Clone, Serde)]
pub struct Album {
    pub name: ByteArray,
    pub artist: ContractAddress,
    pub genre: ByteArray,
    pub releaseDate: u256,
    pub songs: Array<u256>,
}

#[starknet::storage_node]
pub struct AlbumNode {
    pub name: ByteArray,
    pub artist: ContractAddress,
    pub genre: ByteArray,
    pub releaseDate: u256,
    pub songs: Vec<u256>,
}

#[derive(Drop, Clone, Serde)]
pub struct Listing {
    pub seller: ContractAddress,
    pub song_id: u256,
    pub price: u256,
    pub copies: u256
}

#[starknet::storage_node]
pub struct ListingNode {
    pub seller: ContractAddress,
    pub song_id: u256,
    pub price: u256,
    pub copies: u256
}

#[starknet::interface]
pub trait IGroovv<TContractState> {
    // Song functions

    // Artist creates a song, and the number of copies available
    // the song is created by the contract and the caller is assumed to be the artists and populates the necessary fields
    // The song is added to the map of ids to songs
    // An event is emitted for the created song
    // The song is sent to the artist's address -> where users will be able to buy it
    fn mint_song(ref self: TContractState, song: Song, price: u128, copies: u128);

    // mints more copies of an existing song
    // fn mint_more_copies(ref self: TContractState, id: u256, copies: u256);

    // Updates the price of a song
    // Only the artist can update the price of their song
    fn update_song_price(ref self: TContractState, id: u256, new_price: u256);

    // Creates an album - list of songs
    // Adds each song in an album to the mapping of ids to songs
    // Adds album to a mapping of ids to albums
    // Event is emitted for the created album
    // Ensure only Studio Owner can create an album
    // Song is sent to the studio contract
    // fn mint_album(ref self: TContractState, id: u256, songs: Array<SongCreate>, copies: u256);

    // Gets a song at id
    // Returns the song from the mapping of ids to songs
    fn get_song(self: @TContractState, id: u256) -> Song;

    // Returns listing details at id.
    fn get_listing(self: @TContractState, id: u256) -> Listing;

    // Returns token balance (copy count) for a wallet and song token id.
    fn get_song_balance(
        self: @TContractState, owner: ContractAddress, song_id: u256
    ) -> u256;

    // Allows user to buy a song in the form of an nft used as an access key to the song stored in NBs storage vault
    // expected_price protects buyers from last-moment listing price changes.
    fn buy_song(ref self: TContractState, id: u256, expected_price: u256, copies: u256, tip: u256);

    // Allows users to sell the song back into the market for the market price unless bought for another amount
    fn list_song(ref self: TContractState, song_id: u256, price: u256, copies: u256);

    // Allows listing owners to remove copies from their listing and reclaim escrowed copies.
    // Passing all listed copies removes the listing entirely.
    fn remove_listing(ref self: TContractState, id: u256, copies: u256);

    fn create_album(ref self: TContractState, album: Album);

    // Allows user to buy an album in the form of an nft used as an access key to the album stored in NBs storage vault
    // Cheaper to buy an album than a song on average
    // fn buy_album(ref self: TContractState, ids: Array<u256>);
    // Gets an album at id
    // Returns the album from the mapping of ids to albums
    // fn get_album(self: @TContractState, id: u256) -> Array<u256>;
    fn add_song_to_album(ref self: TContractState, album_id: u256, song_id: u256);
    fn set_ratio_hundredths(ref self: TContractState, ratio_hundredths: u16);
    fn get_ratio_hundredths(self: @TContractState) -> u16;
    fn withdraw_funds(ref self: TContractState, to: ContractAddress, amount: u256);
    
    fn upgrade(ref self: TContractState, new_class_hash: ClassHash);
}
