#[starknet::interface]
pub trait INoteblock<TContractState> {
    // Account functions
    // Creates an account for a user
    // Account is added to a mapping of ids to accounts 
    // Event is emitted for the created account
    fn createAccount(ref self: TContractState, address: ContractAddress);

    // Gets an account of the user
    fn getAccount(self: @TContractState, id: u256) -> Account;
}





