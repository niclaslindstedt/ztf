//! Parsing rules for `PathSpec` (the `path[::scenario]` CLI argument).
use std::path::PathBuf;
use std::str::FromStr;
use ztf::cli::PathSpec;

#[test]
fn parses_bare_path() {
    let spec = PathSpec::from_str("tests/foo.toml").unwrap();
    assert_eq!(spec.path, PathBuf::from("tests/foo.toml"));
    assert!(spec.scenario.is_none());
}

#[test]
fn parses_path_and_scenario() {
    let spec = PathSpec::from_str("tests/foo.toml::greets_user").unwrap();
    assert_eq!(spec.path, PathBuf::from("tests/foo.toml"));
    assert_eq!(spec.scenario.as_deref(), Some("greets_user"));
}

#[test]
fn parses_scenario_with_spaces() {
    // The shell removes the outer quotes; the arg we receive already contains
    // the spaces as literal characters.
    let spec = PathSpec::from_str("tests/foo.toml::greets a user by name").unwrap();
    assert_eq!(spec.scenario.as_deref(), Some("greets a user by name"));
}

#[test]
fn splits_on_first_double_colon_only() {
    // Scenario names may contain `::`; only the first `::` is the separator.
    let spec = PathSpec::from_str("a.toml::ns::item").unwrap();
    assert_eq!(spec.path, PathBuf::from("a.toml"));
    assert_eq!(spec.scenario.as_deref(), Some("ns::item"));
}

#[test]
fn rejects_empty_scenario() {
    let err = PathSpec::from_str("foo.toml::").unwrap_err();
    assert!(err.contains("scenario filter is empty"), "got: {err}");
}

#[test]
fn rejects_empty_path() {
    let err = PathSpec::from_str("::scenario").unwrap_err();
    assert!(err.contains("path is empty"), "got: {err}");
}
