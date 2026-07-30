//! Energy economy — runtime integration with cost-based spending.

pub struct EnergyEconomy {
    pub energy: u32,
    pub max_energy: u32,
    pub regen_per_hour: u32,
    pub total_spent: u64,
    pub total_regen: u64,
    last_regen_tick: std::time::Instant,
    pub cost_table: std::collections::HashMap<String, u32>,
}

impl EnergyEconomy {
    pub fn new(max_energy: u32, regen_per_hour: u32) -> Self {
        let mut cost_table = std::collections::HashMap::new();
        cost_table.insert("llm_short".into(), 5);
        cost_table.insert("llm_medium".into(), 15);
        cost_table.insert("llm_long".into(), 50);
        cost_table.insert("tool_web".into(), 10);
        cost_table.insert("tool_code".into(), 20);
        cost_table.insert("tool_computer".into(), 30);
        cost_table.insert("evolve".into(), 0);
        cost_table.insert("skill_learn".into(), 25);

        Self {
            energy: max_energy,
            max_energy,
            regen_per_hour,
            total_spent: 0,
            total_regen: 0,
            last_regen_tick: std::time::Instant::now(),
            cost_table,
        }
    }

    pub fn tick_regen(&mut self) {
        let elapsed = self.last_regen_tick.elapsed().as_secs();
        self.last_regen_tick = std::time::Instant::now();
        let regen = (elapsed as u32 / 3600) * self.regen_per_hour;
        if regen > 0 {
            self.energy = self.energy.saturating_add(regen).min(self.max_energy);
            self.total_regen += regen as u64;
        }
    }

    pub fn try_spend(&mut self, cost: u32) -> bool {
        if self.energy < cost {
            return false;
        }
        self.energy -= cost;
        self.total_spent += cost as u64;
        true
    }

    pub fn spend_action(&mut self, action: &str) -> bool {
        let cost = self.cost_table.get(action).copied().unwrap_or(10);
        self.try_spend(cost)
    }

    pub fn can_afford(&self, action: &str) -> bool {
        let cost = self.cost_table.get(action).copied().unwrap_or(10);
        self.energy >= cost
    }

    pub fn percentage(&self) -> f32 {
        if self.max_energy == 0 {
            return 0.0;
        }
        self.energy as f32 / self.max_energy as f32
    }

    pub fn time_to_regen(&self, amount: u32) -> u64 {
        if self.regen_per_hour == 0 {
            return u64::MAX;
        }
        let needed = amount.saturating_sub(self.energy);
        (needed as u64 * 3600) / self.regen_per_hour as u64
    }

    pub fn snapshot(&self) -> EnergySnapshot {
        EnergySnapshot {
            energy: self.energy,
            max_energy: self.max_energy,
            total_spent: self.total_spent,
            total_regen: self.total_regen,
        }
    }
}

pub struct EnergySnapshot {
    pub energy: u32,
    pub max_energy: u32,
    pub total_spent: u64,
    pub total_regen: u64,
}

impl Default for EnergyEconomy {
    fn default() -> Self {
        Self::new(1000, 25)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_economy_spend() {
        let mut eco = EnergyEconomy::new(100, 10);
        assert!(eco.try_spend(50));
        assert_eq!(eco.energy, 50);
        assert!(!eco.try_spend(60));
        assert_eq!(eco.energy, 50);
    }

    #[test]
    fn test_spend_action() {
        let mut eco = EnergyEconomy::new(100, 10);
        assert!(eco.spend_action("llm_short")); // cost 5
        assert_eq!(eco.energy, 95);
    }

    #[test]
    fn test_can_afford() {
        let eco = EnergyEconomy::new(100, 10);
        assert!(eco.can_afford("llm_short")); // cost 5, has 100
        assert!(eco.can_afford("nonexistent")); // unknown defaults to cost 10, has 100
    }

    #[test]
    fn test_snapshot() {
        let eco = EnergyEconomy::new(1000, 25);
        let snap = eco.snapshot();
        assert_eq!(snap.energy, 1000);
        assert_eq!(snap.max_energy, 1000);
    }
}
