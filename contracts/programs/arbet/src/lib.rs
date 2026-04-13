use anchor_lang::prelude::*;

declare_id!("ArBEt11111111111111111111111111111111111111");

#[program]
pub mod arbet {
    use super::*;

    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        position_limit_bps: u16,
        max_drawdown_bps: u16,
    ) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;
        global_config.authority = ctx.accounts.authority.key();
        global_config.position_limit_bps = position_limit_bps;
        global_config.max_drawdown_bps = max_drawdown_bps;
        global_config.protocol_fee_bps = 5;
        global_config.execution_count = 0;
        global_config.protocol_fee_collected = 0;
        global_config.is_paused = false;

        msg!("Global config initialized");
        Ok(())
    }

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.balance = 0;
        vault.initial_balance = 0;
        vault.cumulative_pnl = 0;
        vault.max_balance = 0;
        vault.min_balance = 0;
        vault.num_trades = 0;
        vault.is_paused = false;

        msg!("Vault initialized for authority: {}", ctx.accounts.authority.key());
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, ErrorCode::InvalidAmount);
        require!(amount_lamports >= 5000, ErrorCode::BelowMinimum);

        let vault = &mut ctx.accounts.vault;

        // Update vault balance
        vault.balance = vault.balance.checked_add(amount_lamports as i64)
            .ok_or(ErrorCode::BalanceOverflow)?;

        // Set initial balance if this is the first deposit
        if vault.initial_balance == 0 {
            vault.initial_balance = vault.balance;
        }

        // Update max balance tracking
        if vault.balance > vault.max_balance {
            vault.max_balance = vault.balance;
        }

        // Transfer SOL from user to vault
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.depositor.key(),
            &vault.key(),
            amount_lamports,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        msg!("Deposit successful: {} lamports into vault", amount_lamports);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, ErrorCode::InvalidAmount);

        let vault = &mut ctx.accounts.vault;
        require!(vault.balance >= amount_lamports as i64, ErrorCode::InsufficientBalance);
        require!(!vault.is_paused, ErrorCode::VaultPaused);

        // Update vault balance
        vault.balance = vault.balance.checked_sub(amount_lamports as i64)
            .ok_or(ErrorCode::BalanceUnderflow)?;

        // Update min balance tracking
        if vault.balance < vault.min_balance || vault.min_balance == 0 {
            vault.min_balance = vault.balance;
        }

        // Transfer SOL from vault to user
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &vault.key(),
            &ctx.accounts.withdrawer.key(),
            amount_lamports,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &transfer_instruction,
            &[
                vault.to_account_info(),
                ctx.accounts.withdrawer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
            &[&[b"vault", ctx.accounts.authority.key().as_ref(), &[ctx.bumps.vault]]],
        )?;

        msg!("Withdrawal successful: {} lamports from vault", amount_lamports);
        Ok(())
    }
}

// === ACCOUNTS & DATA STRUCTURES ===

#[account]
pub struct GlobalConfig {
    pub authority: Pubkey,                  // Admin authority
    pub position_limit_bps: u16,           // Max position as % of TVL (basis points)
    pub max_drawdown_bps: u16,             // Max cumulative loss % (basis points)
    pub protocol_fee_bps: u8,              // Fee on execution (basis points)
    pub execution_count: u64,              // Total executions
    pub protocol_fee_collected: i64,       // Lamports collected in fees
    pub is_paused: bool,                   // Emergency pause flag
}

#[account]
pub struct VaultPDA {
    pub authority: Pubkey,                 // Vault owner (wallet)
    pub balance: i64,                      // Current balance in lamports
    pub initial_balance: i64,              // Initial deposit
    pub cumulative_pnl: i64,               // Total PnL
    pub max_balance: i64,                  // Highest balance reached
    pub min_balance: i64,                  // Lowest balance reached
    pub num_trades: u64,                   // Total trades executed
    pub is_paused: bool,                   // Vault paused flag
}

#[account]
pub struct TradeLog {
    pub vault: Pubkey,
    pub trade_id: u64,
    pub timestamp: i64,
    pub buy_amount: u64,
    pub sell_amount: u64,
    pub actual_edge_bps: u16,
    pub pnl_lamports: i64,
    pub execution_slot: u64,
}

#[account]
pub struct TradeIntent {
    pub vault: Pubkey,
    pub trade_id: u64,
    pub buy_market_id: u64,
    pub sell_market_id: u64,
    pub buy_amount: u64,
    pub min_sell_amount: u64,
    pub estimated_edge_bps: u16,
    pub timestamp: i64,
}

// === CONTEXTS ===

#[derive(Accounts)]
#[instruction(position_limit_bps: u16, max_drawdown_bps: u16)]
pub struct InitializeGlobalConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<GlobalConfig>(),
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<VaultPDA>(),
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultPDA>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", depositor.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultPDA>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump,
        constraint = vault.authority == authority.key()
    )]
    pub vault: Account<'info, VaultPDA>,

    #[account(mut)]
    pub withdrawer: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

// === ERRORS ===

#[error_code]
pub enum ErrorCode {
    #[msg("Vault is paused")]
    VaultPaused,

    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Position limit exceeded")]
    PositionLimitExceeded,

    #[msg("Edge estimate too low")]
    EdgeTooLow,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Drawdown limit exceeded")]
    DrawdownLimitExceeded,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Below minimum amount")]
    BelowMinimum,

    #[msg("Balance overflow")]
    BalanceOverflow,

    #[msg("Balance underflow")]
    BalanceUnderflow,
}
