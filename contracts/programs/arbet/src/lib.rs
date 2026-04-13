use anchor_lang::prelude::*;

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod arbet {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Arbet program initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
