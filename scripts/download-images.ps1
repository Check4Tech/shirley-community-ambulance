$ErrorActionPreference = "Continue"
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
$root = "https://img1.wsimg.com/isteam/ip/f4e4e2b5-fba2-4099-b4b7-ed41666c947e/"
$dest = "public\images"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

# name -> source path on the original site (sized down to sane web dimensions)
$images = [ordered]@{
    "logo.jpg"          = "18119599_1355252527928135_1819568425242974930_.jpg/:/rs=w:512,h:512,m"
    "patch.jpg"         = "355630087_751363793662717_524543178237853348_n.jpg/:/rs=w:600,cg:true,m"
    "hero-crew.jpg"     = "16486899_10102104542212575_3018216020244429160_o.jpg/:/rs=w:1920,m"
    "station.jpg"       = "1abcbaf1-2408-47ae-82af-4b52660b6db1.jpg/:/rs=w:1600,m"
    "parade.jpg"        = "281932651_5183086465144703_1153852190204105435.jpg/:/rs=w:1600,m"
    "ambulance.jpg"     = "385004253_814005540730710_2386094608110985894_.jpg/:/rs=w:1600,m"
    "students.jpg"      = "350293188_1020500792689302_1001130747532569323.jpg/:/rs=w:1600,m"
    "youth-group.jpg"   = "fb_2645951175524924_960x720.jpg/:/rs=w:960,cg:true,m"
    "raffle.png"        = "Gemini_Generated_Image_pfaxsupfaxsupfax.png/:/rs=w:806,h:995"
    "greek-isles.jpg"   = "LuxGive_GlitteringGreekIsles_02.jpg/:/rs=w:1110,cg:true,m"
    "greek-isles-2.jpg" = "LuxGive_GlitteringGreekIsles_05.jpg/:/rs=w:1110,cg:true,m"
    "riviera-maya.jpg"  = "LuxGive_RivieraMayaMagic_04.jpg/:/rs=w:1110,cg:true,m"
    "riviera-maya-2.jpg"= "LuxGive_RivieraMayaMagic_09.jpg/:/rs=w:1110,cg:true,m"
}

foreach ($name in $images.Keys) {
    $url = $root + $images[$name]
    $out = Join-Path $dest $name
    try {
        Invoke-WebRequest -Uri $url -OutFile $out -UserAgent $ua -UseBasicParsing
        Write-Output ("OK   " + $name + "  (" + [math]::Round((Get-Item $out).Length / 1KB) + " KB)")
    } catch {
        Write-Output ("FAIL " + $name + "  " + $_.Exception.Message)
    }
    Start-Sleep -Milliseconds 400
}
