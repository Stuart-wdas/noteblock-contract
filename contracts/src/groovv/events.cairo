use starknet::ContractAddress;

#[derive(Drop, starknet::Event)]
pub enum GroovvEvents {
    SongCreated: SongCreated,
    SongUpdated: SongUpdated,
    AlbumCreated: AlbumCreated,
    ListingCreated: ListingCreated, 
    ListingPurchased: ListingPurchased,
    ListingRemoved: ListingRemoved,
    FundsWithdrawn: FundsWithdrawn,
}

#[derive(Drop, starknet::Event)]
pub struct SongCreated {
    #[key]
    pub song_id: u256,
    #[key]
    pub artist: ContractAddress,
    pub name: ByteArray,
    pub genre: ByteArray,
    pub length: u256,
    pub release_date: u256,
    pub cid: felt252,
}

#[derive(Drop, starknet::Event)]
pub struct SongUpdated {
    #[key]
    pub listing_id: u256,
    #[key]
    pub seller: ContractAddress,
    pub new_price: u256,
}

#[derive(Drop, starknet::Event)]
pub struct AlbumCreated {
    #[key]
    pub album_id: u256,
    #[key]
    pub artist: ContractAddress,
    pub name: ByteArray,
    pub genre: ByteArray,
    pub release_date: u256,
    pub songs_count: u32,
}

#[derive(Drop, starknet::Event)]
pub struct ListingCreated {
    #[key]
    pub seller: ContractAddress,
    #[key]
    pub listing_id: u256,
    #[key]
    pub song_id: u256,
    #[key]
    pub price: u256,
    pub copies: u256
}


#[derive(Drop, starknet::Event)]
pub struct ListingPurchased {
    #[key]
    pub buyer: ContractAddress,
    #[key]
    pub seller: ContractAddress,
    #[key]
    pub listing_id: u256,
    #[key]
    pub song_id: u256,
    pub price: u256,
    pub copies: u256,
    pub total_cost: u256,
}

#[derive(Drop, starknet::Event)]
pub struct ListingRemoved {
    #[key]
    pub seller: ContractAddress,
    #[key]
    pub listing_id: u256,
    #[key]
    pub song_id: u256,
    pub removed_copies: u256,
    pub remaining_copies: u256,
}

#[derive(Drop, starknet::Event)]
pub struct FundsWithdrawn {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub recipient: ContractAddress,
    pub amount: u256,
}
