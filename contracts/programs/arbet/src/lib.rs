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

    pub fn execute_arb(
        ctx: Context<ExecuteArb>,
        buy_market_id: u64,
        sell_market_id: u64,
        buy_amount_lamports: u64,
        min_sell_amount_lamports: u64,
        estimated_edge_bps: u16,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let global_config = &ctx.accounts.global_config;

        // Validation checks
        require!(!vault.is_paused, ErrorCode::VaultPaused);
        require!(!global_config.is_paused, ErrorCode::VaultPaused);
        require!(buy_amount_lamports > 0, ErrorCode::InvalidAmount);
        require!(buy_amount_lamports >= 5000, ErrorCode::BelowMinimum);
        require!(estimated_edge_bps > 100, ErrorCode::EdgeTooLow);
        require!(vault.balance >= buy_amount_lamports as i64, ErrorCode::InsufficientBalance);

        // Position limit check: buy_amount <= TVL * position_limit_bps / 10000
        let position_limit = (vault.balance as u128)
            .saturating_mul(global_config.position_limit_bps as u128)
            .saturating_div(10000);

        require!(
            (buy_amount_lamports as u128) <= position_limit,
            ErrorCode::PositionLimitExceeded
        );

        // Slippage check: min_sell_amount >= 98% of expected
        let expected_sell_amount = (buy_amount_lamports as u128)
            .saturating_mul((10000 + estimated_edge_bps as u128))
            .saturating_div(10000);

        let min_threshold = expected_sell_amount
            .saturating_mul(98)
            .saturating_div(100);

        require!(
            (min_sell_amount_lamports as u128) >= min_threshold,
            ErrorCode::SlippageExceeded
        );

        // Deduct from vault balance (will be restored if trade fails, or finalized in record_trade)
        vault.balance = vault.balance
            .checked_sub(buy_amount_lamports as i64)
            .ok_or(ErrorCode::BalanceUnderflow)?;

        // Create TradeIntent (temporary state)
        let trade_intent = &mut ctx.accounts.trade_intent;
        trade_intent.vault = vault.key();
        trade_intent.trade_id = vault.num_trades;
        trade_intent.buy_market_id = buy_market_id;
        trade_intent.sell_market_id = sell_market_id;
        trade_intent.buy_amount = buy_amount_lamports;
        trade_intent.min_sell_amount = min_sell_amount_lamports;
        trade_intent.estimated_edge_bps = estimated_edge_bps;
        trade_intent.timestamp = Clock::get()?.unix_timestamp;

        msg!(
            "Execute arb initiated: buy {} lamports, min sell {}, edge {} bps",
            buy_amount_lamports,
            min_sell_amount_lamports,
            estimated_edge_bps
        );

        Ok(())
    }

    pub fn record_trade(
        ctx: Context<RecordTrade>,
        actual_buy_amount_lamports: u64,
        actual_sell_amount_lamports: u64,
        execution_price_bps: u16,
        pnl_lamports: i64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let trade_intent = &ctx.accounts.trade_intent;

        require!(actual_buy_amount_lamports > 0, ErrorCode::InvalidAmount);
        require!(actual_sell_amount_lamports > 0, ErrorCode::InvalidAmount);

        // Create immutable TradeLog
        let trade_log = &mut ctx.accounts.trade_log;
        trade_log.vault = vault.key();
        trade_log.trade_id = trade_intent.trade_id;
        trade_log.timestamp = Clock::get()?.unix_timestamp;
        trade_log.buy_amount = actual_buy_amount_lamports;
        trade_log.sell_amount = actual_sell_amount_lamports;
        trade_log.actual_edge_bps = execution_price_bps;
        trade_log.pnl_lamports = pnl_lamports;
        trade_log.execution_slot = Clock::get()?.slot;

        // Update vault state
        vault.balance = vault.balance
            .checked_add(actual_sell_amount_lamports as i64)
            .ok_or(ErrorCode::BalanceOverflow)?
            .checked_sub(actual_buy_amount_lamports as i64)
            .ok_or(ErrorCode::BalanceUnderflow)?;

        vault.cumulative_pnl = vault.cumulative_pnl
            .checked_add(pnl_lamports)
            .ok_or(ErrorCode::BalanceOverflow)?;

        vault.num_trades = vault.num_trades.checked_add(1)
            .ok_or(ErrorCode::TradeLimitExceeded)?;

        // Update max/min balance
        if vault.balance > vault.max_balance {
            vault.max_balance = vault.balance;
        }
        if vault.balance < vault.min_balance || vault.min_balance == 0 {
            vault.min_balance = vault.balance;
        }

        // TradeIntent is now consumed (can be closed by client)
        msg!(
            "Trade recorded: trade_id {}, pnl {} lamports",
            trade_intent.trade_id,
            pnl_lamports
        );

        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_position_limit_bps: Option<u16>,
        new_max_drawdown_bps: Option<u16>,
        new_protocol_fee_bps: Option<u8>,
    ) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;

        require!(
            global_config.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        if let Some(limit) = new_position_limit_bps {
            require!(limit <= 10000, ErrorCode::InvalidParameter);
            global_config.position_limit_bps = limit;
        }

        if let Some(drawdown) = new_max_drawdown_bps {
            require!(drawdown <= 10000, ErrorCode::InvalidParameter);
            global_config.max_drawdown_bps = drawdown;
        }

        if let Some(fee) = new_protocol_fee_bps {
            require!(fee <= 100, ErrorCode::InvalidParameter);
            global_config.protocol_fee_bps = fee;
        }

        msg!("Global config updated");
        Ok(())
    }

    pub fn emergency_pause(ctx: Context<EmergencyPause>, pause_flag: bool) -> Result<()> {
        let global_config = &mut ctx.accounts.global_config;

        require!(
            global_config.authority == ctx.accounts.authority.key(),
            ErrorCode::Unauthorized
        );

        global_config.is_paused = pause_flag;

        msg!("Emergency pause set to: {}", pause_flag);
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

#[derive(Accounts)]
pub struct ExecuteArb<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultPDA>,

    #[account(
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<TradeIntent>(),
        seeds = [b"trade_intent", vault.key().as_ref(), &[vault.num_trades as u8]],
        bump
    )]
    pub trade_intent: Account<'info, TradeIntent>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordTrade<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultPDA>,

    #[account(
        seeds = [b"trade_intent", vault.key().as_ref(), &[vault.num_trades as u8]],
        bump,
        close = authority
    )]
    pub trade_intent: Account<'info, TradeIntent>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<TradeLog>(),
        seeds = [b"trade_log", vault.key().as_ref(), &[vault.num_trades as u8]],
        bump
    )]
    pub trade_log: Account<'info, TradeLog>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
}

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"global_config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
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

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid parameter")]
    InvalidParameter,

    #[msg("Trade limit exceeded")]
    TradeLimitExceeded,
}
