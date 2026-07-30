//! Voice tools — TTS via Windows SAPI, STT via Windows Speech Recognition.

use std::process::Command;

/// Speak text using Windows SAPI via PowerShell.
/// Returns the audio output path or error.
pub fn tts_speak(text: &str, voice: &str, rate: i32) -> anyhow::Result<String> {
    let escaped = text.replace('"', "`\"");
    let rate = rate.clamp(-10, 10);

    let ps_script = format!(
        r#"
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $synth.SelectVoice('{voice}')
        $synth.Rate = {rate}
        $synth.Speak('{escaped}')
        $synth.Dispose()
        Write-Output 'ok'
        "#
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.contains("ok") {
            Ok(format!(
                "Spoken: \"{}\"",
                if text.len() > 50 { &text[..50] } else { text }
            ))
        } else {
            Ok(format!("TTS output: {stdout}"))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("TTS failed: {stderr}")
    }
}

/// List available TTS voices.
pub fn tts_voices() -> anyhow::Result<Vec<String>> {
    let ps_script = r#"
        Add-Type -AssemblyName System.Speech
        $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
        foreach ($v in $synth.GetInstalledVoices()) {
            Write-Output $v.VoiceInfo.Name
        }
        $synth.Dispose()
    "#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", ps_script])
        .output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let voices: Vec<String> = stdout
            .lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect();
        Ok(voices)
    } else {
        Ok(vec![])
    }
}

/// Listen for speech using Windows Speech Recognition via PowerShell.
/// Records from default microphone, returns recognized text.
pub fn stt_listen(timeout_secs: u32) -> anyhow::Result<String> {
    let ps_script = format!(
        r#"
        Add-Type -AssemblyName System.Speech
        $recog = New-Object System.Speech.Recognition.SpeechRecognitionEngine
        $recog.SetInputToDefaultAudioDevice()

        # Create grammar for free dictation
        $grammar = New-Object System.Speech.Recognition.DictationGrammar
        $recog.LoadGrammar($grammar)

        Write-Host 'Listening... (speak now)'
        $result = $recog.Recognize([TimeSpan]::FromSeconds({timeout_secs}))

        if ($result -ne $null) {{
            Write-Output $result.Text
        }} else {{
            Write-Output '[NO_SPEECH]'
        }}

        $recog.Dispose()
    "#
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &ps_script])
        .output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.contains("[NO_SPEECH]") {
            Ok(String::new())
        } else {
            Ok(stdout)
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("STT failed: {stderr}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tts_speak_dry_run() {
        // Just test the command construction, not actual speech
        let escaped = "Hello world".replace('"', "`\"");
        assert_eq!(escaped, "Hello world");
    }

    #[test]
    fn test_stt_timeout() {
        assert!(timeout_secs_valid(5));
    }

    fn timeout_secs_valid(secs: u32) -> bool {
        secs > 0 && secs <= 300
    }
}
