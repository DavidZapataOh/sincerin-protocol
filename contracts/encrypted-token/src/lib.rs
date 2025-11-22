#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Bytes, BytesN, Env, String,
};

#[derive(Clone)]
#[contracttype]
pub struct DepositRequest {
    pub request_id: BytesN<32>,
    pub user: Address,
    pub amount: i128,
    pub timestamp: u64,
    pub ledger: u32,
    pub encrypted_index: Bytes,
}

#[derive(Clone)]
#[contracttype]
pub struct EncryptedBalance {
    pub encrypted_amount: Bytes,
    pub encrypted_key_user: Bytes,
    pub encrypted_key_server: Bytes,
    pub timestamp: u64,
    pub exists: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    ServerManager,
    TokenContract,
    UserEncryptedIndex(Address),
    EncryptedBalance(BytesN<32>), // user_index => encrypted balance
    DepositRequest(BytesN<32>),   // request_id => deposit request
    DepositCompleted(BytesN<32>), // request_id => bool
    EncryptedSupply,
}

#[contract]
pub struct EncryptedTokenContract;

#[contractimpl]
impl EncryptedTokenContract {
    /// Initialize the contract with server manager and token contract
    pub fn initialize(env: Env, server_manager: Address, token_contract: Address) {
        if env.storage().instance().has(&DataKey::ServerManager) {
            panic!("Already initialized");
        }

        env.storage()
            .instance()
            .set(&DataKey::ServerManager, &server_manager);
        env.storage()
            .instance()
            .set(&DataKey::TokenContract, &token_contract);
        env.storage().instance().set(&DataKey::EncryptedSupply, &0i128);
    }

    /// User authenticates by providing encrypted index
    /// This stores the encrypted index for future lookups
    pub fn authenticate_user(env: Env, user: Address, encrypted_index: Bytes) {
        user.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::UserEncryptedIndex(user.clone()), &encrypted_index);

        // Emit event
        env.events().publish(
            (String::from_str(&env, "user_authenticated"),),
            (user, encrypted_index),
        );
    }

    /// User requests a deposit
    /// Transfers tokens to contract and emits event for server to process
    pub fn request_deposit(env: Env, user: Address, amount: i128, encrypted_index: Bytes) {
        user.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Auto-authenticate if not already authenticated
        if !env
            .storage()
            .persistent()
            .has(&DataKey::UserEncryptedIndex(user.clone()))
        {
            env.storage()
                .persistent()
                .set(&DataKey::UserEncryptedIndex(user.clone()), &encrypted_index);
        }

        // Get token contract
        let token_contract: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap();

        let token_client = token::Client::new(&env, &token_contract);

        // Transfer tokens from user to this contract
        // TODO: Uncomment this for production - commented for testing without token setup
        // token_client.transfer(&user, &env.current_contract_address(), &amount);

        // Create request ID and packed data
        let ledger = env.ledger().sequence();
        let timestamp = env.ledger().timestamp();

        // Use encrypted_index as packed_data (simpler, avoids conversion issues)
        let packed_data = encrypted_index.clone();

        // Hash encrypted_index to create unique request ID
        let request_id: BytesN<32> = env.crypto().keccak256(&encrypted_index).into();

        // Store deposit request
        let deposit_request = DepositRequest {
            request_id: request_id.clone(),
            user: user.clone(),
            amount,
            timestamp,
            ledger,
            encrypted_index: encrypted_index.clone(),
        };

        env.storage()
            .temporary()
            .set(&DataKey::DepositRequest(request_id.clone()), &deposit_request);

        // Emit event with all data needed by server
        env.events().publish(
            (String::from_str(&env, "deposit_requested"),),
            (request_id, packed_data, encrypted_index),
        );
    }

    /// Server stores encrypted balance (only server manager can call)
    pub fn store_deposit(
        env: Env,
        request_id: BytesN<32>,
        user_address: Address,
        amount: i128,
        user_index: BytesN<32>,
        encrypted_amount: Bytes,
        encrypted_key_user: Bytes,
        encrypted_key_server: Bytes,
    ) {
        // Only server manager can call this
        let server_manager: Address = env
            .storage()
            .instance()
            .get(&DataKey::ServerManager)
            .unwrap();
        server_manager.require_auth();

        // Check if already completed
        if env
            .storage()
            .temporary()
            .get::<_, bool>(&DataKey::DepositCompleted(request_id.clone()))
            .unwrap_or(false)
        {
            panic!("Deposit already completed");
        }

        // Update encrypted supply
        let current_supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::EncryptedSupply)
            .unwrap_or(0);
        let new_supply = current_supply + amount;
        env.storage()
            .instance()
            .set(&DataKey::EncryptedSupply, &new_supply);

        // Store encrypted balance
        let encrypted_balance = EncryptedBalance {
            encrypted_amount: encrypted_amount.clone(),
            encrypted_key_user: encrypted_key_user.clone(),
            encrypted_key_server: encrypted_key_server.clone(),
            timestamp: env.ledger().timestamp(),
            exists: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::EncryptedBalance(user_index.clone()), &encrypted_balance);

        // Mark as completed
        env.storage()
            .temporary()
            .set(&DataKey::DepositCompleted(request_id.clone()), &true);

        // Emit event
        env.events().publish(
            (String::from_str(&env, "balance_stored"),),
            (
                request_id,
                user_address,
                encrypted_amount,
                encrypted_key_user,
                encrypted_key_server,
            ),
        );
    }

    /// Get user's encrypted index by address
    pub fn get_user_index_by_address(env: Env, user_address: Address) -> Bytes {
        env.storage()
            .persistent()
            .get(&DataKey::UserEncryptedIndex(user_address))
            .unwrap_or(Bytes::new(&env))
    }

    /// Get encrypted balance by user index
    pub fn get_encrypted_balance(env: Env, user_index: BytesN<32>) -> EncryptedBalance {
        env.storage()
            .persistent()
            .get(&DataKey::EncryptedBalance(user_index))
            .unwrap_or(EncryptedBalance {
                encrypted_amount: Bytes::new(&env),
                encrypted_key_user: Bytes::new(&env),
                encrypted_key_server: Bytes::new(&env),
                timestamp: 0,
                exists: false,
            })
    }

    /// Get deposit request by request ID
    pub fn get_deposit_request(env: Env, request_id: BytesN<32>) -> DepositRequest {
        env.storage()
            .temporary()
            .get(&DataKey::DepositRequest(request_id.clone()))
            .unwrap_or_else(|| {
                // Return empty request if not found
                DepositRequest {
                    request_id: request_id.clone(),
                    user: Address::from_string(&String::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")),
                    amount: 0,
                    timestamp: 0,
                    ledger: 0,
                    encrypted_index: Bytes::new(&env),
                }
            })
    }

    /// Check if deposit is completed
    pub fn deposit_completed(env: Env, request_id: BytesN<32>) -> bool {
        env.storage()
            .temporary()
            .get(&DataKey::DepositCompleted(request_id))
            .unwrap_or(false)
    }

    /// Get total encrypted supply
    pub fn encrypted_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::EncryptedSupply)
            .unwrap_or(0)
    }

    /// Get server manager address
    pub fn get_server_manager(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::ServerManager)
            .unwrap()
    }

    /// Get token contract address
    pub fn get_token_contract(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::TokenContract)
            .unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, MockAuth, MockAuthInvoke},
        Address, Env, IntoVal,
    };

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EncryptedTokenContract);
        let client = EncryptedTokenContractClient::new(&env, &contract_id);

        let server_manager = Address::generate(&env);
        let token_contract = Address::generate(&env);

        client.initialize(&server_manager, &token_contract);

        assert_eq!(client.get_server_manager(), server_manager);
        assert_eq!(client.get_token_contract(), token_contract);
        assert_eq!(client.encrypted_supply(), 0);
    }

    #[test]
    fn test_authenticate_user() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EncryptedTokenContract);
        let client = EncryptedTokenContractClient::new(&env, &contract_id);

        let server_manager = Address::generate(&env);
        let token_contract = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&server_manager, &token_contract);

        let encrypted_index = Bytes::from_array(&env, &[1u8; 32]);
        client.mock_auths(&[MockAuth {
            address: &user,
            invoke: &MockAuthInvoke {
                contract: &contract_id,
                fn_name: "authenticate_user",
                args: (user.clone(), encrypted_index.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }])
        .authenticate_user(&user, &encrypted_index);

        let stored_index = client.get_user_index_by_address(&user);
        assert_eq!(stored_index, encrypted_index);
    }
}
