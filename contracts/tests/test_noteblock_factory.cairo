use starknet::SyscallResultTrait;
use snforge_std::{
    declare,
    ContractClassTrait,
    DeclareResultTrait,
    get_class_hash,
    start_cheat_caller_address,
    start_mock_call,
    interact_with_state,
 };
use openzeppelin::token::erc1155::interface::IERC1155_RECEIVER_ID;
use openzeppelin::utils::serde::SerializedAppend;
use starknet::{ClassHash, ContractAddress, };
use groovv::groovv::interface::*;
use groovv::groovv::groovv::Groovv::InternalGroovvTrait;
use groovv::groovv::groovv::Groovv;



const USDC_TOKEN: ContractAddress = 0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080.try_into().unwrap();

fn deploy_groovv() -> ContractAddress {
    let contract = declare("Groovv").unwrap_syscall().contract_class();
    let owner = build_owner();
    let token_uri: ByteArray = "token uri";
    let mut constructor_calldata = array![];
    constructor_calldata.append_serde(owner);
    constructor_calldata.append_serde(token_uri);
    constructor_calldata.append_serde(USDC_TOKEN);
    let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap_syscall();
    contract_address
}

fn build_owner() -> ContractAddress {
    'owner'.try_into().unwrap()
}

fn build_buyer() -> ContractAddress {
    'buyer'.try_into().unwrap()
}

fn build_resale_buyer() -> ContractAddress {
    'resale_buyer'.try_into().unwrap()
}

fn build_intruder() -> ContractAddress {
    'intruder'.try_into().unwrap()
}

fn build_song() -> Song {
    let owner = build_owner();
    Song {
        name: "song",
        artist: owner,
        genre: "genre",
        length: 300,
        releaseDate: 20240101,
        feat: array![],
        CID: 'cid',
    }
}

fn mock_address_as_erc1155_receiver(address: ContractAddress) {
    start_mock_call(address, selector!("supports_interface"), true);
    start_mock_call(address, selector!("on_erc1155_received"), IERC1155_RECEIVER_ID);
    start_mock_call(address, selector!("on_erc1155_batch_received"), IERC1155_RECEIVER_ID);
}

fn mock_usdc_calls(balance: u256) {
    start_mock_call(USDC_TOKEN, selector!("balance_of"), balance);
    start_mock_call(USDC_TOKEN, selector!("transfer_from"), true);
}

fn mint_song_for_owner(contract_address: ContractAddress, price: u128, copies: u128) {
    let owner = build_owner();
    let dispatcher = IGroovvDispatcher { contract_address };
    mock_address_as_erc1155_receiver(owner);
    mock_usdc_calls(1_000_000);
    start_cheat_caller_address(contract_address, owner);
    dispatcher.mint_song(build_song(), price, copies);
}

fn create_album_with_song_one(contract_address: ContractAddress, owner: ContractAddress) {
    let dispatcher = IGroovvDispatcher { contract_address };
    let album_song_ids: Array<u256> = array![1];
    let album = Album {
        name: "album",
        artist: owner,
        genre: "afrohouse",
        releaseDate: 20251201,
        songs: album_song_ids,
    };

    start_cheat_caller_address(contract_address, owner);
    dispatcher.create_album(album);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_deploy_groovv() {
        deploy_groovv();
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_create_song() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 1, 10);

    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_get_song() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 1, 10);

        let dispatcher = IGroovvDispatcher { contract_address };
        let expected = build_song();
        let song = dispatcher.get_song(1);

        assert(song.name == expected.name, 'song_name');
        assert(song.artist == build_owner(), 'song_artist');
        assert(song.genre == expected.genre, 'song_genre');
        assert(song.length == expected.length, 'song_length');
        assert(song.releaseDate == expected.releaseDate, 'song_release');
        assert(song.feat.len() == expected.feat.len(), 'song_feat');
        assert(song.CID == expected.CID, 'song_cid');
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_get_song_rejects_missing_id() {
        let contract_address = deploy_groovv();
        let dispatcher = IGroovvDispatcher { contract_address };
        dispatcher.get_song(1);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_get_song_balance_tracks_wallet_and_escrow() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let buyer = build_buyer();
        mint_song_for_owner(contract_address, 4, 5);

        let dispatcher = IGroovvDispatcher { contract_address };

        // Initial mint escrow: all listed copies are held by the marketplace contract.
        let owner_balance_after_mint = dispatcher.get_song_balance(owner, 1);
        assert(
            owner_balance_after_mint == 0.try_into().unwrap(),
            'owner_bal_after_mint',
        );

        // Buyer acquires copies from listing.
        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(8);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(1, 4, 2, 0);

        let buyer_balance_after_buy = dispatcher.get_song_balance(buyer, 1);
        assert(
            buyer_balance_after_buy == 2.try_into().unwrap(),
            'buyer_bal_after_buy',
        );

        // Removing the remaining listing returns escrowed copies to the owner wallet.
        start_cheat_caller_address(contract_address, owner);
        dispatcher.remove_listing(1, 3);

        let owner_balance_after_remove = dispatcher.get_song_balance(owner, 1);
        assert(
            owner_balance_after_remove == 3.try_into().unwrap(),
            'owner_bal_after_remove',
        );
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_get_song_balance_rejects_missing_song() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let dispatcher = IGroovvDispatcher { contract_address };
        dispatcher.get_song_balance(owner, 1);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_update_song_price_by_owner() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        mint_song_for_owner(contract_address, 1, 10);

        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, owner);
        dispatcher.update_song_price(1, 9);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_update_song_price_rejects_non_owner() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 1, 10);

        let intruder = build_intruder();
        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, intruder);
        dispatcher.update_song_price(1, 9);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_buy_song() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        mint_song_for_owner(contract_address, 3, 1);

        let dispatcher = IGroovvDispatcher { contract_address };
        mock_usdc_calls(3);
        start_cheat_caller_address(contract_address, owner);
        dispatcher.buy_song(1, 3, 1, 0);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_buy_song_secondary_sale_pays_artist_royalty() {
        let contract_address = deploy_groovv();
        let first_buyer = build_buyer();
        let second_buyer = build_resale_buyer();
        mint_song_for_owner(contract_address, 5, 1);

        let dispatcher = IGroovvDispatcher { contract_address };

        // Primary sale: buyer purchases directly from artist.
        mock_address_as_erc1155_receiver(first_buyer);
        mock_usdc_calls(5);
        start_cheat_caller_address(contract_address, first_buyer);
        dispatcher.buy_song(1, 5, 1, 0);

        // Secondary sale: first buyer relists, second buyer purchases.
        start_cheat_caller_address(contract_address, first_buyer);
        dispatcher.list_song(1, 10, 1);

        mock_address_as_erc1155_receiver(second_buyer);
        mock_usdc_calls(10);
        start_cheat_caller_address(contract_address, second_buyer);
        dispatcher.buy_song(2, 10, 1, 0);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_buy_song_fails_when_insufficient_funds() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 3, 1);

        let buyer = build_buyer();
        let dispatcher = IGroovvDispatcher { contract_address };
        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(2);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(1, 3, 1, 0);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_buy_song_fails_when_price_changed() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 3, 1);

        let buyer = build_buyer();
        let dispatcher = IGroovvDispatcher { contract_address };
        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(3);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(1, 2, 1, 0);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_list_song() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let buyer = build_buyer();
        mint_song_for_owner(contract_address, 1, 10);

        let dispatcher = IGroovvDispatcher { contract_address };
        mock_usdc_calls(2);
        start_cheat_caller_address(contract_address, owner);
        dispatcher.buy_song(1, 1, 2, 0);

        start_cheat_caller_address(contract_address, owner);
        dispatcher.list_song(1, 4, 2);

        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(8);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(2, 4, 2, 0);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_remove_listing_by_owner() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        mint_song_for_owner(contract_address, 3, 1);

        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, owner);
        dispatcher.remove_listing(1, 1);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_remove_listing_partial_keeps_listing_active() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let buyer = build_buyer();
        mint_song_for_owner(contract_address, 3, 5);

        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, owner);
        dispatcher.remove_listing(1, 2);

        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(9);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(1, 3, 3, 0);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_remove_listing_rejects_excess_copies() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        mint_song_for_owner(contract_address, 3, 1);

        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, owner);
        dispatcher.remove_listing(1, 2);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_remove_listing_rejects_non_owner() {
        let contract_address = deploy_groovv();
        mint_song_for_owner(contract_address, 3, 1);

        let intruder = build_intruder();
        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, intruder);
        dispatcher.remove_listing(1, 1);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_buy_song_rejects_removed_listing() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let buyer = build_buyer();
        mint_song_for_owner(contract_address, 3, 1);

        let dispatcher = IGroovvDispatcher { contract_address };
        start_cheat_caller_address(contract_address, owner);
        dispatcher.remove_listing(1, 1);

        mock_address_as_erc1155_receiver(buyer);
        mock_usdc_calls(3);
        start_cheat_caller_address(contract_address, buyer);
        dispatcher.buy_song(1, 3, 1, 0);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_create_album() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        mint_song_for_owner(contract_address, 1, 10);

        create_album_with_song_one(contract_address, owner);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_add_song_to_album() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let dispatcher = IGroovvDispatcher { contract_address };

        mint_song_for_owner(contract_address, 1, 10);
        start_cheat_caller_address(contract_address, owner);
        dispatcher.mint_song(build_song(), 2, 8);

        create_album_with_song_one(contract_address, owner);
        start_cheat_caller_address(contract_address, owner);
        dispatcher.add_song_to_album(1, 2);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_add_song_to_album_rejects_duplicate_song() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let dispatcher = IGroovvDispatcher { contract_address };

        mint_song_for_owner(contract_address, 1, 10);
        create_album_with_song_one(contract_address, owner);

        start_cheat_caller_address(contract_address, owner);
        dispatcher.add_song_to_album(1, 1);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_create_album_rejects_duplicate_song_ids() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let dispatcher = IGroovvDispatcher { contract_address };
        let album_song_ids: Array<u256> = array![1, 1];
        let album = Album {
            name: "album",
            artist: owner,
            genre: "afrohouse",
            releaseDate: 20251201,
            songs: album_song_ids,
        };

        mint_song_for_owner(contract_address, 1, 10);
        start_cheat_caller_address(contract_address, owner);
        dispatcher.create_album(album);
    }

    #[test]
    #[fork("SEPOLIA_LATEST")]
    fn test_upgrade_by_owner() {
        let contract_address = deploy_groovv();
        let owner = build_owner();
        let dispatcher = IGroovvDispatcher { contract_address };
        let class_hash = get_class_hash(contract_address);

        start_cheat_caller_address(contract_address, owner);
        dispatcher.upgrade(class_hash);
    }

    #[test]
    #[should_panic]
    #[fork("SEPOLIA_LATEST")]
    fn test_upgrade_rejects_non_owner() {
        let contract_address = deploy_groovv();
        let intruder = build_intruder();
        let dispatcher = IGroovvDispatcher { contract_address };
        let new_class_hash: ClassHash = 1.try_into().unwrap();

        start_cheat_caller_address(contract_address, intruder);
        dispatcher.upgrade(new_class_hash);
    }

    #[test]
    fn test_calc_fees() {
        let contract_address = deploy_groovv();
        IGroovvDispatcher { contract_address };

        interact_with_state(
            contract_address, 
            || {
                let mut state = Groovv::contract_state_for_testing();

                state._calculate_fees(80000000.try_into().unwrap(), 1.try_into().unwrap());
            
                return state;
            }
        );

    }
}
