use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address};
use openzeppelin_utils::serde::SerializedAppend;
use starknet::{ContractAddress};
use noteblock::noteblock_factory::{INoteblockFactoryDispatcher, INoteblockFactoryDispatcherTrait , StudioData};

const UDC_ADDRESS: felt252 = 0x04a64cd09a853868621d94cae9952b106f2c36a3f81260f85de6696c6b050221;

fn deploy_noteblock_factory() -> ContractAddress {
    let contract = declare("NoteblockFactory").unwrap().contract_class();
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let noteblock_studio_contract = declare("NoteblockStudio").unwrap().contract_class();
    let noteblock_studio_contract_hash = *noteblock_studio_contract.class_hash;
    let noteblock_song_contract = declare("NoteblockSong").unwrap().contract_class();
    let notenoteblock_song_contract_hash = *noteblock_song_contract.class_hash;
    let mut constructor_calldata = array![];
    constructor_calldata.append_serde(owner);
    constructor_calldata.append_serde(UDC_ADDRESS);
    constructor_calldata.append_serde(noteblock_studio_contract_hash);
    constructor_calldata.append_serde(notenoteblock_song_contract_hash);

    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    return contract_address;
}

fn validate_studio_data() -> StudioData {
    let studio_data = StudioData {
        id: 100, 
        name: "TestStudio", 
        location: "TestAddress", 
        website: "TestWebsite",
        social_media: "TestSocialMedia"
    };

    return studio_data;
}

#[test]
fn test_constructor() {
    deploy_noteblock_factory();
}

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_noteblock_factory_create_and_get_studio() {
    let contract_address = deploy_noteblock_factory();

    let artist: ContractAddress = 'artist'.try_into().unwrap();
    
    let noteblock_factory = INoteblockFactoryDispatcher { contract_address };

    start_cheat_caller_address(contract_address, artist);

    let token_id: felt252 = 500;

    let studio_data = validate_studio_data();
    let studio_clone = studio_data.clone();

    let studio_address = noteblock_factory.create_studio(artist, token_id, studio_data);
    let studio_data_fetch = noteblock_factory.get_studio(studio_address);

    assert_eq!(studio_data_fetch.id, studio_clone.id);
}

#[test]
#[fork("SEPOLIA_LATEST")]
fn test_noteblock_factory_mint_song() {
    let contract_address = deploy_noteblock_factory();

    let artist: ContractAddress = 'artist'.try_into().unwrap();
    
    let noteblock_factory = INoteblockFactoryDispatcher { contract_address };

    start_cheat_caller_address(contract_address, artist);

    let token_id: felt252 = 500;

    let studio_data = validate_studio_data();
    let studio_clone = studio_data.clone();

    let studio_address = noteblock_factory.create_studio(artist, token_id, studio_data);
    let studio_data_fetch = noteblock_factory.get_studio(studio_address);
    assert_eq!(studio_data_fetch.id, studio_clone.id);

    let token_uri: ByteArray = "token_id";
    noteblock_factory.mint_song(50, token_uri, artist, 50);
}

