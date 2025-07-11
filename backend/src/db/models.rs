use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::schema::*;

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = imap_accounts)]
pub struct ImapAccount {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
    pub created_at: String,
    pub updated_at: String,
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = email_rules)]
pub struct EmailRule {
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = feeds)]
pub struct Feed {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Queryable, Selectable)]
#[diesel(table_name = feed_items)]
pub struct FeedItem {
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
        }
    }
}