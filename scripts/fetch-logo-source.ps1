# Pulls the largest available rendition of the shoulder patch / shield artwork
# from the original site's image CDN so we have a good source to cut out.
$ErrorActionPreference = "Continue"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$root = "https://img1.wsimg.com/isteam/ip/f4e4e2b5-fba2-4099-b4b7-ed41666c947e/"
$dest = "scripts\logo-src"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$candidates = [ordered]@{
    "shield-orig.jpg"  = "18119599_1355252527928135_1819568425242974930_.jpg"
    "shield-2048.jpg"  = "18119599_1355252527928135_1819568425242974930_.jpg/:/rs=w:2048,h:2048,m"
    "patch-orig.jpg"   = "355630087_751363793662717_524543178237853348_n.jpg"
    "patch-2048.jpg"   = "355630087_751363793662717_524543178237853348_n.jpg/:/rs=w:2048,cg:true,m"
}

foreach ($name in $candidates.Keys) {
    $out = Join-Path $dest $name
    try {
        Invoke-WebRequest -Uri ($root + $candidates[$name]) -OutFile $out -UserAgent $ua -UseBasicParsing
        Write-Output ("OK   " + $name + "  " + [math]::Round((Get-Item $out).Length / 1KB) + " KB")
    } catch {
        Write-Output ("FAIL " + $name + "  " + $_.Exception.Message)
    }
    Start-Sleep -Milliseconds 400
}
