//! Equipment system — items the monster can wear/use.
//! Equipment affects behavior, animation, and tool usage.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Equipment {
    pub id: String,
    pub name: String,
    pub slot: EquipSlot,
    pub icon: String,
    pub description: String,
    pub effects: EquipEffects,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EquipSlot {
    Head,
    Body,
    Held,
    Back,
    Accessory,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipEffects {
    pub energy_bonus: i32,
    pub learning_speed: f32,
    pub tool_preference: Vec<String>,
    pub mood_modifier: String,
    pub animation_hint: String,
}

impl Equipment {
    pub fn all() -> Vec<Self> {
        vec![
            Self {
                id: "laptop".into(),
                name: "Laptop".into(),
                slot: EquipSlot::Held,
                icon: "💻".into(),
                description: "Coding companion. Boosts code-related tasks.".into(),
                effects: EquipEffects {
                    energy_bonus: 0,
                    learning_speed: 0.2,
                    tool_preference: vec!["code_graph".into(), "docs_fetch".into()],
                    mood_modifier: "focused".into(),
                    animation_hint: "typing".into(),
                },
            },
            Self {
                id: "book".into(),
                name: "Ancient Tome".into(),
                slot: EquipSlot::Held,
                icon: "📚".into(),
                description: "Knowledge booster. Faster research.".into(),
                effects: EquipEffects {
                    energy_bonus: 0,
                    learning_speed: 0.3,
                    tool_preference: vec!["web_search".into(), "docs_fetch".into()],
                    mood_modifier: "thinking".into(),
                    animation_hint: "reading".into(),
                },
            },
            Self {
                id: "sword".into(),
                name: "Debug Blade".into(),
                slot: EquipSlot::Held,
                icon: "⚔️".into(),
                description: "Cuts through bugs. Boosts error fixing.".into(),
                effects: EquipEffects {
                    energy_bonus: -5,
                    learning_speed: 0.1,
                    tool_preference: vec!["code_graph".into()],
                    mood_modifier: "proud".into(),
                    animation_hint: "slash".into(),
                },
            },
            Self {
                id: "headphones".into(),
                name: "Focus Phones".into(),
                slot: EquipSlot::Head,
                icon: "🎧".into(),
                description: "Blocks distractions. Boosts focus.".into(),
                effects: EquipEffects {
                    energy_bonus: 10,
                    learning_speed: 0.15,
                    tool_preference: vec![],
                    mood_modifier: "focused".into(),
                    animation_hint: "vibing".into(),
                },
            },
            Self {
                id: "coffee".into(),
                name: "Energy Brew".into(),
                slot: EquipSlot::Held,
                icon: "☕".into(),
                description: "Caffeine boost. More energy, less sleep.".into(),
                effects: EquipEffects {
                    energy_bonus: 20,
                    learning_speed: 0.0,
                    tool_preference: vec![],
                    mood_modifier: "excited".into(),
                    animation_hint: "caffeinated".into(),
                },
            },
            Self {
                id: "cape".into(),
                name: "Wizard Cape".into(),
                slot: EquipSlot::Back,
                icon: "🧣".into(),
                description: "Mystical aura. Boosts all skills slightly.".into(),
                effects: EquipEffects {
                    energy_bonus: 5,
                    learning_speed: 0.1,
                    tool_preference: vec![],
                    mood_modifier: "proud".into(),
                    animation_hint: "flowing".into(),
                },
            },
            Self {
                id: "drone".into(),
                name: "Scout Drone".into(),
                slot: EquipSlot::Accessory,
                icon: "🤖".into(),
                description: "Auto-searches for tasks. Passive XP gain.".into(),
                effects: EquipEffects {
                    energy_bonus: -10,
                    learning_speed: 0.05,
                    tool_preference: vec!["web_search".into()],
                    mood_modifier: "happy".into(),
                    animation_hint: "floating".into(),
                },
            },
            Self {
                id: "vr_headset".into(),
                name: "VR Visor".into(),
                slot: EquipSlot::Head,
                icon: "🥽".into(),
                description: "Deep immersion. Boosts memory tasks.".into(),
                effects: EquipEffects {
                    energy_bonus: -5,
                    learning_speed: 0.25,
                    tool_preference: vec!["code_graph".into(), "docs_fetch".into()],
                    mood_modifier: "thinking".into(),
                    animation_hint: "immersed".into(),
                },
            },
        ]
    }

    pub fn get(id: &str) -> Option<Self> {
        Self::all().into_iter().find(|e| e.id == id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentLoadout {
    pub head: Option<Equipment>,
    pub body: Option<Equipment>,
    pub held: Option<Equipment>,
    pub back: Option<Equipment>,
    pub accessory: Option<Equipment>,
}

impl EquipmentLoadout {
    pub fn new() -> Self {
        Self {
            head: None,
            body: None,
            held: None,
            back: None,
            accessory: None,
        }
    }

    pub fn equip(&mut self, item: Equipment) -> Option<Equipment> {
        let slot = item.slot.clone();
        let old = match &slot {
            EquipSlot::Head => self.head.take(),
            EquipSlot::Body => self.body.take(),
            EquipSlot::Held => self.held.take(),
            EquipSlot::Back => self.back.take(),
            EquipSlot::Accessory => self.accessory.take(),
        };
        match &slot {
            EquipSlot::Head => self.head = Some(item),
            EquipSlot::Body => self.body = Some(item),
            EquipSlot::Held => self.held = Some(item),
            EquipSlot::Back => self.back = Some(item),
            EquipSlot::Accessory => self.accessory = Some(item),
        }
        old
    }

    pub fn total_effects(&self) -> EquipEffects {
        let mut effects = EquipEffects {
            energy_bonus: 0,
            learning_speed: 0.0,
            tool_preference: vec![],
            mood_modifier: "idle".into(),
            animation_hint: "none".into(),
        };
        for item in [&self.head, &self.body, &self.held, &self.back, &self.accessory] {
            if let Some(item) = item {
                effects.energy_bonus += item.effects.energy_bonus;
                effects.learning_speed += item.effects.learning_speed;
                effects.tool_preference.extend(item.effects.tool_preference.clone());
            }
        }
        effects
    }

    pub fn to_json(&self) -> String {
        serde_json::json!({
            "head": self.head.as_ref().map(|e| &e.id),
            "body": self.body.as_ref().map(|e| &e.id),
            "held": self.held.as_ref().map(|e| &e.id),
            "back": self.back.as_ref().map(|e| &e.id),
            "accessory": self.accessory.as_ref().map(|e| &e.id),
        }).to_string()
    }
}
