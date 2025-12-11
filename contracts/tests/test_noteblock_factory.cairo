use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address};
use openzeppelin::utils::serde::SerializedAppend;
use starknet::{ContractAddress};
use groovv::groovv::interface::*;

const UDC_ADDRESS: felt252 = 0x04a64cd09a853868621d94cae9952b106f2c36a3f81260f85de6696c6b050221;
const USDC_TOKEN: ContractAddress = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.try_into().unwrap();

fn deploy_groovv() -> ContractAddress {
    let contract = declare("Groovv").unwrap().contract_class();
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let token_uri: ByteArray = "token uri";
    let mut constructor_calldata = array![];
    constructor_calldata.append_serde(owner);
    constructor_calldata.append_serde(token_uri);
    constructor_calldata.append_serde(USDC_TOKEN);
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
    return contract_address;
}

fn build_song () -> Song {
let mock_song = Song {
    name: "song",
    artist: 'artist'.try_into().unwrap(),
    genre: "genre",
    length: 300,
    releaseDate: 20240101,
    feat: array![],
    CID: 'cid'.try_into().unwrap()
};
return mock_song;
}

fn test_deploy_song() {
    let contract_address = deploy_groovv();
    let owner: ContractAddress = 'owner'.try_into().unwrap();
    let song = build_song();

    let dispatcher = IGroovvDispatcher { contract_address: contract_address };

    start_cheat_caller_address(owner, contract_address);

    dispatcher.mint_song(song, 1, 10, "mock uri");

}

#[cfg(test)]
mod tests {
    use super::*;
   #[test]
    fn test_deploy_groovv() {
        deploy_groovv();
    }

    #[test]
    fn test_create_song() {
        test_deploy_song();
    }
}


