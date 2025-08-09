use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::schema::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmailAction {
    #[serde(rename = "mark_read")]
    MarkAsRead,
    #[serde(rename = "delete")]
    Delete,
    #[serde(rename = "move_to_folder")]
    MoveToFolder,
    #[serde(rename = "do_nothing")]
    DoNothing,
}

impl EmailAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            EmailAction::MarkAsRead => "mark_read",
            EmailAction::Delete => "delete", 
            EmailAction::MoveToFolder => "move_to_folder",
            EmailAction::DoNothing => "do_nothing",
        }
    }
    
    pub fn from_str(s: &str) -> Self {
        match s {
            "delete" => EmailAction::Delete,
            "move_to_folder" => EmailAction::MoveToFolder,
            "do_nothing" => EmailAction::DoNothing,
            _ => EmailAction::MarkAsRead, // Default
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = imap_accounts)]
pub struct ImapAccount {
    pub id: Option<String>,    // Changed to match Nullable<Text> in schema
    pub name: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
    pub created_at: String,
    pub updated_at: String,
    pub default_post_process_action: String,
    pub default_move_to_folder: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Insertable)]
#[diesel(table_name = imap_accounts)]
pub struct NewImapAccount {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
    pub created_at: String,
    pub updated_at: String,
    pub default_post_process_action: String,
    pub default_move_to_folder: Option<String>,
}

impl NewImapAccount {
    pub fn new(name: String, host: String, port: i32, username: String, password: String, use_tls: bool) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host,
            port,
            username,
            password,
            use_tls,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            default_post_process_action: "mark_read".to_string(),
            default_move_to_folder: None,
        }
    }
    
    pub fn with_defaults(name: String, host: String, port: i32, username: String, password: String, use_tls: bool, default_post_process_action: String, default_move_to_folder: Option<String>) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            host,
            port,
            username,
            password,
            use_tls,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            default_post_process_action,
            default_move_to_folder,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = email_rules)]
pub struct EmailRule {
    pub id: Option<String>,
    pub name: String,
    pub imap_account_id: String,
    pub folder: String,
    pub to_address: Option<String>,
    pub from_address: Option<String>,
    pub subject_contains: Option<String>,
    pub label: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub post_process_action: String,
    pub move_to_folder: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Insertable)]
#[diesel(table_name = email_rules)]
pub struct NewEmailRule {
    pub id: String,
    pub name: String,
    pub imap_account_id: String,
    pub folder: String,
    pub to_address: Option<String>,
    pub from_address: Option<String>,
    pub subject_contains: Option<String>,
    pub label: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub post_process_action: String,
    pub move_to_folder: Option<String>,
}

impl NewEmailRule {
    pub fn new(
        name: String,
        imap_account_id: String,
        folder: String,
        to_address: Option<String>,
        from_address: Option<String>,
        subject_contains: Option<String>,
        label: Option<String>,
        is_active: bool,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            imap_account_id,
            folder,
            to_address,
            from_address,
            subject_contains,
            label,
            is_active,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            post_process_action: "mark_read".to_string(),
            move_to_folder: None,
        }
    }
    
    pub fn with_defaults(
        name: String,
        imap_account_id: String,
        folder: String,
        to_address: Option<String>,
        from_address: Option<String>,
        subject_contains: Option<String>,
        label: Option<String>,
        is_active: bool,
        post_process_action: String,
        move_to_folder: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            imap_account_id,
            folder,
            to_address,
            from_address,
            subject_contains,
            label,
            is_active,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            post_process_action,
            move_to_folder,
        }
    }
    
    pub fn from_account_defaults(
        name: String,
        imap_account: &ImapAccount,
        folder: String,
        to_address: Option<String>,
        from_address: Option<String>,
        subject_contains: Option<String>,
        label: Option<String>,
        is_active: bool,
    ) -> Self {
        Self::with_defaults(
            name,
            imap_account.id.as_ref().unwrap_or(&String::new()).clone(),
            folder,
            to_address,
            from_address,
            subject_contains,
            label,
            is_active,
            imap_account.default_post_process_action.clone(),
            imap_account.default_move_to_folder.clone(),
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = feeds)]
pub struct Feed {
    pub id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub max_items: Option<i32>,
    pub max_age_days: Option<i32>,
    pub min_items: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Insertable)]
#[diesel(table_name = feeds)]
pub struct NewFeed {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub max_items: Option<i32>,
    pub max_age_days: Option<i32>,
    pub min_items: Option<i32>,
}

impl NewFeed {
    pub fn new(
        title: String,
        description: Option<String>,
        link: Option<String>,
        email_rule_id: String,
        feed_type: String,
        is_active: bool,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            link,
            email_rule_id,
            feed_type,
            is_active,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            max_items: Some(100),       // Default: keep last 100 items
            max_age_days: Some(30),     // Default: keep items for 30 days
            min_items: Some(10),        // Default: always keep at least 10 items
        }
    }

    pub fn with_retention(
        title: String,
        description: Option<String>,
        link: Option<String>,
        email_rule_id: String,
        feed_type: String,
        is_active: bool,
        max_items: Option<i32>,
        max_age_days: Option<i32>,
        min_items: Option<i32>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            description,
            link,
            email_rule_id,
            feed_type,
            is_active,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            max_items: max_items.or(Some(100)),       // Default: keep last 100 items
            max_age_days: max_age_days.or(Some(30)),  // Default: keep items for 30 days
            min_items: min_items.or(Some(10)),        // Default: always keep at least 10 items
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = feed_items)]
pub struct FeedItem {
    pub id: Option<String>,
    pub feed_id: String,
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub author: Option<String>,
    pub pub_date: String,
    pub email_message_id: Option<String>,
    pub email_subject: Option<String>,
    pub email_from: Option<String>,
    pub email_body: Option<String>,
    pub created_at: String,
    pub is_read: Option<bool>,
    pub starred: Option<bool>,
    pub body_size: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Insertable)]
#[diesel(table_name = feed_items)]
pub struct NewFeedItem {
    pub id: String,
    pub feed_id: String,
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub author: Option<String>,
    pub pub_date: String,
    pub email_message_id: Option<String>,
    pub email_subject: Option<String>,
    pub email_from: Option<String>,
    pub email_body: Option<String>,
    pub created_at: String,
    pub is_read: Option<bool>,
    pub starred: Option<bool>,
    pub body_size: Option<i32>,
}

impl NewFeedItem {
    pub fn new(
        feed_id: String,
        title: String,
        description: Option<String>,
        link: Option<String>,
        author: Option<String>,
        pub_date: DateTime<Utc>,
        email_message_id: Option<String>,
        email_subject: Option<String>,
        email_from: Option<String>,
        email_body: Option<String>,
    ) -> Self {
        let body_size = email_body.as_ref().map(|body| body.len() as i32).unwrap_or(0);
        Self {
            id: Uuid::new_v4().to_string(),
            feed_id,
            title,
            description,
            link,
            author,
            pub_date: pub_date.to_rfc3339(),
            email_message_id,
            email_subject,
            email_from,
            email_body,
            created_at: Utc::now().to_rfc3339(),
            is_read: Some(false),           // New items start unread
            starred: Some(false),           // New items start unstarred
            body_size: Some(body_size),     // Calculate body size
        }
    }
}