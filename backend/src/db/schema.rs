// @generated automatically by Diesel CLI.

diesel::table! {
    email_rules (id) {
        id -> Nullable<Text>,
        name -> Text,
        imap_account_id -> Text,
        folder -> Text,
        to_address -> Nullable<Text>,
        from_address -> Nullable<Text>,
        subject_contains -> Nullable<Text>,
        label -> Nullable<Text>,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    feed_items (id) {
        id -> Nullable<Text>,
        feed_id -> Text,
        title -> Text,
        description -> Nullable<Text>,
        link -> Nullable<Text>,
        author -> Nullable<Text>,
        pub_date -> Text,
        email_message_id -> Nullable<Text>,
        email_subject -> Nullable<Text>,
        email_from -> Nullable<Text>,
        email_body -> Nullable<Text>,
        created_at -> Text,
    }
}

diesel::table! {
    feeds (id) {
        id -> Nullable<Text>,
        title -> Text,
        description -> Nullable<Text>,
        link -> Nullable<Text>,
        email_rule_id -> Text,
        feed_type -> Text,
        is_active -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::table! {
    imap_accounts (id) {
        id -> Nullable<Text>,
        name -> Text,
        host -> Text,
        port -> Integer,
        username -> Text,
        password -> Text,
        use_tls -> Bool,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::joinable!(email_rules -> imap_accounts (imap_account_id));
diesel::joinable!(feed_items -> feeds (feed_id));
diesel::joinable!(feeds -> email_rules (email_rule_id));

diesel::allow_tables_to_appear_in_same_query!(
    email_rules,
    feed_items,
    feeds,
    imap_accounts,
);
