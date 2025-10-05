use crate::groovy::interface::{Song};

#[event]
#[derive(Drop, starknet::Event)]
pub enum GroovyEvent {
    SongCreated: SongCreated,
    SongUpdated: SongUpdated
}

#[derive(Drop, starknet::Event)]
pub struct SongCreated {
    id: u256,
    song: Song,

}

#[derive(Drop, starknet::Event)]
pub struct SongUpdated {
    id: u256,
    song: Song,

}