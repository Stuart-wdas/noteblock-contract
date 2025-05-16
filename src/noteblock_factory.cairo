use starknet::{ClassHash, ContractAddress};

#[derive(Drop, Serde)]
pub struct StudioData {
    pub name: ByteArray, 
    pub location: ByteArray,
    pub website: ByteArray,
    pub social_media: ByteArray,    
}

#[starknet::interface]
pub trait INBFactory<TContractState> {
    // Creates a new studio contract for the owner
    // Adds the studio to a mapping of ids to studios
    // Event is emitted for the created studio
    fn create_studio(ref self: TContractState, owner: ContractAddress, token_id: u256, studio_data: StudioData) -> ContractAddress;

    // Returns the studio address at index
    fn get_studio(self: @TContractState, index: u256) -> ContractAddress;
}


#[starknet::contract]
pub mod NBFactory {
    use starknet::storage::{
        Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess,
        StorageMapWriteAccess, StoragePathEntry, Vec, VecTrait, MutableVecTrait,
    };
    use core::starknet::{ContractAddress, get_caller_address, ClassHash};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_utils::interfaces::{IUniversalDeployerDispatcher, IUniversalDeployerDispatcherTrait};
    use openzeppelin_utils::serde::SerializedAppend;

    

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    // Ownable Mixin
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        noteblock_studio_hash: ClassHash, 
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        studios: Map<u256, ContractAddress>,
        universal_deployer_address: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        NewStudioCreated: NewStudioCreated,
         #[flat]
        OwnableEvent: OwnableComponent::Event
    }

    #[derive(Drop, starknet::Event)]
    pub struct NewStudioCreated {
        owner: ContractAddress,
        studio: ContractAddress,
    }


    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, universal_deployer_address: ContractAddress) {
        self.universal_deployer_address.write(universal_deployer_address);
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl NBFactoryImpl of super::INBFactory<ContractState> {
        fn create_studio(ref self: ContractState, owner: ContractAddress, token_id: u256, studio_data: StudioData) -> ContractAddress {

            // let dispatcher = IUniversalDeployerDispatcher {
            //     contract_address: self.universal_deployer_address.read(),
            // };

            // let mut studio_calldata = array![];
            // studio_calldata.append_serde(owner)

            // let studio_address = dispatcher.deploy_contract(
            //     self.noteblock_studio_hash.read(),
            //     token_id, 
            //     false, 
            //     studio_calldata.span(),
            // );

        }

        fn get_studio(self: @ContractState, index: u256) -> ContractAddress {
            return self.studios.entry(index).read();
        }
    }
}

