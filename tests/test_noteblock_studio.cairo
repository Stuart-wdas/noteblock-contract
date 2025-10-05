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


fn deploy_noteblock_studio() -> ContractAddress {
    let contract = declare("NoteblockStudio").unwrap().contract_class();
    let artist:ContractAddress = 'artist'.try_into().unwrap();
    let nft: ContractAddress = 'nft'.try_into().unwrap();
    
    let mut constructor_calldata = array![];

    let studio_data = validate_studio_data();
    constructor_calldata.append_serde(artist);
    constructor_calldata.append_serde(studio_data);
    constructor_calldata.append_serde(nft);

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
    deploy_noteblock_studio();
}