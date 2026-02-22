param(
    [Parameter(Mandatory=$true)]
    [string]$Word,

    [string]$OutDir = "D:/programs/Obsidian/Vaults/Personal/_Cache"
)

$ErrorActionPreference = "Stop"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
$baseUrl = "https://dictionary.cambridge.org"
$dictUrl = "$baseUrl/dictionary/english/$Word"

# Fetch the dictionary page
try {
    $response = Invoke-WebRequest -Uri $dictUrl -UserAgent $ua -UseBasicParsing
} catch {
    Write-Error "Failed to fetch page for '$Word': $_"
    exit 1
}

# Extract .ogg audio URLs (first UK, then US)
$pattern = '/media/english/[^"'']+\.ogg'
$allMatches = [regex]::Matches($response.Content, $pattern)

if ($allMatches.Count -lt 2) {
    Write-Error "Could not find both UK and US audio for '$Word'. Found $($allMatches.Count) match(es)."
    exit 1
}

$ukPath = $allMatches[0].Value
$usPath = $allMatches[1].Value

$ukFile = Join-Path $OutDir "${Word}_uk.ogg"
$usFile = Join-Path $OutDir "${Word}_us.ogg"

# Download UK audio
Invoke-WebRequest -Uri "$baseUrl$ukPath" -UserAgent $ua -OutFile $ukFile

# Download US audio
Invoke-WebRequest -Uri "$baseUrl$usPath" -UserAgent $ua -OutFile $usFile

# Verify
$ukSize = (Get-Item $ukFile).Length
$usSize = (Get-Item $usFile).Length

if ($ukSize -eq 0 -or $usSize -eq 0) {
    Write-Error "One or both audio files are empty."
    exit 1
}

Write-Output "OK"
Write-Output "UK: ${Word}_uk.ogg ($ukSize bytes)"
Write-Output "US: ${Word}_us.ogg ($usSize bytes)"
