use std::process::ExitCode;

#[tokio::main]
async fn main() -> ExitCode {
    match dr::run_cli().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("dr: {error}");
            ExitCode::FAILURE
        }
    }
}
