use anyhow::Result;
use atom_syndication::{Feed as AtomFeed, Entry, Person, Content, Text};
use chrono::{DateTime, Utc};
use rss::{Channel, Item, Guid};
use crate::db::models::{Feed, FeedItem};

pub struct FeedGenerator;

impl FeedGenerator {
    pub fn generate_rss(feed: &Feed, items: &[FeedItem]) -> Result<String> {
        let mut channel = Channel::default();
        
        channel.set_title(&feed.title);
        channel.set_description(feed.description.as_deref().unwrap_or("Mail2Feed RSS"));
        channel.set_link(feed.link.as_deref().unwrap_or("#"));
        
        let mut rss_items = Vec::new();
        
        for item in items {
            let mut rss_item = Item::default();
            
            rss_item.set_title(Some(item.title.clone()));
            rss_item.set_description(item.description.clone());
            rss_item.set_link(item.link.clone());
            rss_item.set_author(item.author.clone());
            rss_item.set_pub_date(Some(item.pub_date.clone()));
            
            // Create a unique GUID for the item
            let guid = Guid {
                value: format!("{}_{}", feed.id, item.id),
                permalink: false,
            };
            rss_item.set_guid(Some(guid));
            
            rss_items.push(rss_item);
        }
        
        channel.set_items(rss_items);
        
        Ok(channel.to_string())
    }
    
    pub fn generate_atom(feed: &Feed, items: &[FeedItem]) -> Result<String> {
        let mut atom_feed = AtomFeed::default();
        
        atom_feed.set_title(feed.title.clone());
        atom_feed.set_id(format!("urn:uuid:{}", feed.id));
        atom_feed.set_updated(Utc::now());
        
        if let Some(description) = &feed.description {
            atom_feed.set_subtitle(Text::plain(description.clone()));
        }
        
        let mut entries = Vec::new();
        
        for item in items {
            let mut entry = Entry::default();
            
            entry.set_id(format!("urn:uuid:{}", item.id));
            entry.set_title(item.title.clone());
            
            // Parse the pub_date string to DateTime<Utc>
            if let Ok(pub_date) = DateTime::parse_from_rfc3339(&item.pub_date) {
                let pub_date_utc = pub_date.with_timezone(&Utc);
                entry.set_published(Some(pub_date)); // Use original FixedOffset for published
                entry.set_updated(pub_date_utc);      // Use UTC for updated
            } else {
                let now = Utc::now();
                // Convert UTC to FixedOffset for published field
                let now_fixed = now.with_timezone(&chrono::FixedOffset::east_opt(0).unwrap());
                entry.set_published(Some(now_fixed));
                entry.set_updated(now);
            }
            
            if let Some(description) = &item.description {
                let content = Content {
                    content_type: Some("html".to_string()),
                    src: None,
                    value: Some(description.clone()),
                    base: None,
                    lang: None,
                };
                entry.set_content(Some(content));
            }
            
            if let Some(author_name) = &item.author {
                let author = Person {
                    name: author_name.clone(),
                    email: None,
                    uri: None,
                };
                entry.set_authors(vec![author]);
            }
            
            entries.push(entry);
        }
        
        atom_feed.set_entries(entries);
        
        Ok(atom_feed.to_string())
    }
    
    pub fn email_to_feed_item(
        feed_id: String,
        subject: &str,
        from: &str,
        body: &str,
        message_id: Option<String>,
        date: DateTime<Utc>,
    ) -> FeedItem {
        FeedItem {
            id: uuid::Uuid::new_v4().to_string(),
            feed_id,
            title: subject.to_string(),
            description: Some(Self::format_email_content(from, body)),
            link: None,
            author: Some(from.to_string()),
            pub_date: date.to_rfc3339(),
            email_message_id: message_id,
            email_subject: Some(subject.to_string()),
            email_from: Some(from.to_string()),
            email_body: Some(body.to_string()),
            created_at: Utc::now().to_rfc3339(),
        }
    }
    
    fn format_email_content(from: &str, body: &str) -> String {
        format!("<p><strong>From:</strong> {}</p><pre>{}</pre>", from, body)
    }
}