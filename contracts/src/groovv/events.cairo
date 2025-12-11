use starknet::ContractAddress;
use crate::groovv::interface::{Song, Album};

#[derive(Drop, starknet::Event)]
pub enum GroovyEvents {
    SongCreated: SongCreated,
    SongUpdated: SongUpdated,
    ListingCreated: ListingCreated, 
    ListingPurchased: ListingPurchased
}

#[derive(Drop, starknet::Event)]
pub struct SongCreated {
    #[key]
    id: u256,
    #[key]
    song: Song,

}

#[derive(Drop, starknet::Event)]
pub struct SongUpdated {
    #[key]
    id: u256,
    #[key]
    song: Song,
}

#[derive(Drop, starknet::Event)]
pub struct AlbumCreated {
    #[key]
    id: u256,
    #[key]
    album: Album,
}

#[derive(Drop, starknet::Event)]
pub struct ListingCreated {
    #[key]
    seller: ContractAddress,
    #[key]
    listing_id: u256,
    #[key]
    price: u256,
    #[key]
    copies: u256
}


#[derive(Drop, starknet::Event)]
pub struct ListingPurchased {
    #[key]
    buyer: ContractAddress,
    #[key]
    song_id: u256,
    #[key]
    price: u256,
    #[key]
    copies: u256
}