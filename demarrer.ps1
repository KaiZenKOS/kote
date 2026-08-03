<#
    Demarrage complet de Kote : backend, application, emulateur.

    Usage :
        .\demarrer.ps1                 tout demarrer
        .\demarrer.ps1 -Reinitialiser  rejouer les migrations et le jeu de donnees
        .\demarrer.ps1 -SansApp        backend seul
        .\demarrer.ps1 -Tests          backend + suites de tests, sans application

    Le script est idempotent : on peut le relancer autant de fois qu'on veut, il
    ne refait que ce qui manque.
#>

param(
    [switch]$Reinitialiser,
    [switch]$SansApp,
    [switch]$Tests,
    [switch]$Production
)

# "Continue" et non "Stop" : en PowerShell 5.1, la moindre ligne ecrite sur la
# sortie d'erreur par un executable natif -- un avertissement de Docker, un
# « no devices found » d'adb pendant l'attente -- devient une erreur terminale.
# Le script controle donc lui-meme ce qui doit echouer, via $LASTEXITCODE et des
# throw explicites.
$ErrorActionPreference = "Continue"
$racine = $PSScriptRoot
$mobile = Join-Path $racine "mobile"
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$adb = Join-Path $sdk "platform-tools\adb.exe"
$emulateur = Join-Path $sdk "emulator\emulator.exe"

# ATTENTION : ce fichier doit rester enregistre en UTF-8 AVEC BOM.
# PowerShell 5.1 lit un .ps1 sans BOM comme de l'ANSI. Un caractere non ASCII y
# devient plusieurs octets, et certains (le tiret cadratin, par exemple)
# produisent un guillemet double qui ferme une chaine en plein milieu : le reste
# du script est alors reparse de travers, sans la moindre erreur visible.

function Etape($texte) { Write-Host "`n== $texte" -ForegroundColor Cyan }
function Info($texte) { Write-Host "   $texte" -ForegroundColor DarkGray }
function Souci($texte) { Write-Host "   $texte" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 1. Docker
# ---------------------------------------------------------------------------
Etape "Docker"

# Note : on teste $LASTEXITCODE et non $?. En PowerShell 5.1, rediriger la sortie
# d'erreur d'un executable natif met $? a $false meme quand la commande a
# reussi -- le script croirait alors que Docker est arrete.
function DockerPret {
    docker info | Out-Null
    return $LASTEXITCODE -eq 0
}

$dockerPret = DockerPret

if (-not $dockerPret) {
    $bureau = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $bureau) {
        Info "Docker Desktop n'est pas demarre, lancement en cours..."
        Start-Process $bureau
        $limite = (Get-Date).AddMinutes(4)
        while ((Get-Date) -lt $limite) {
            Start-Sleep -Seconds 5
            if (DockerPret) { $dockerPret = $true; break }
        }
    }
    if (-not $dockerPret) {
        throw "Docker n'a pas demarre. Ouvrez Docker Desktop puis relancez ce script."
    }
}
Info "Docker est pret."

# ---------------------------------------------------------------------------
# 2. Dependances du depot
# ---------------------------------------------------------------------------
Etape "Dependances"

if (-not (Test-Path (Join-Path $racine "node_modules\supabase"))) {
    Info "Installation de la CLI Supabase..."
    Push-Location $racine
    npm install --no-audit --no-fund --silent
    Pop-Location
}
$supabase = Join-Path $racine "node_modules\.bin\supabase.cmd"

if (-not $SansApp -and -not $Tests) {
    if (-not (Test-Path (Join-Path $mobile "node_modules"))) {
        Info "Installation des dependances de l'application..."
        Push-Location $mobile
        npm install --no-audit --no-fund --silent
        Pop-Location
    }
}
Info "Dependances en place."

# ---------------------------------------------------------------------------
# 3. Backend
# ---------------------------------------------------------------------------
Etape "Backend Supabase"

& $supabase status --workdir $racine | Out-Null
$dejaLance = ($LASTEXITCODE -eq 0)

if ($dejaLance) {
    Info "La pile tourne deja."
} else {
    Info "Demarrage (le premier lancement telecharge les images, comptez plusieurs minutes)..."
    & $supabase start --workdir $racine | Out-Null
}

if ($Reinitialiser) {
    Info "Rejeu des migrations et du jeu de donnees..."
    & $supabase db reset --workdir $racine | Out-Null
}

# Recuperation de la cle anonyme, pour ne jamais avoir a la recopier a la main.
$etat = & $supabase status --workdir $racine -o json | ConvertFrom-Json
$cleAnon = $etat.ANON_KEY
if (-not $cleAnon) { throw "Impossible de lire la cle anonyme depuis supabase status." }
Info "API    : http://127.0.0.1:54321"
Info "Studio : http://127.0.0.1:54323"

if ($Tests) {
    Etape "Tests"
    & $supabase test db --workdir $racine
    $env:CLE_ANON = $cleAnon
    node (Join-Path $racine "scripts\verifier-api.mjs")
    Write-Host "`nTermine." -ForegroundColor Green
    exit 0
}

if ($SansApp) {
    Write-Host "`nBackend pret." -ForegroundColor Green
    exit 0
}

# ---------------------------------------------------------------------------
# 4. Appareil : emulateur ou telephone reel
# ---------------------------------------------------------------------------
Etape "Appareil Android"

if (-not (Test-Path $adb)) {
    throw "adb introuvable dans $sdk. Installez le SDK Android via Android Studio."
}

function AppareilsConnectes {
    (& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" }) `
        | ForEach-Object { ($_ -split "\s+")[0] }
}

$appareils = @(AppareilsConnectes)

if ($appareils.Count -eq 0) {
    $avds = & $emulateur -list-avds
    if (-not $avds) { throw "Aucun telephone connecte et aucun emulateur configure." }
    $avd = @($avds)[0]
    Info "Demarrage de l'emulateur $avd..."
    # -dns-server : l'emulateur herite parfois d'une configuration DNS vide et
    # ne resout alors plus aucun nom d'hote. Les donnees Supabase continuent de
    # passer, car 10.0.2.2 est une adresse IP, mais le fond de carte
    # (tiles.openfreemap.org) echoue silencieusement. On force donc un
    # resolveur connu.
    Start-Process -FilePath $emulateur `
        -ArgumentList "-avd", $avd, "-dns-server", "8.8.8.8,1.1.1.1" `
        -WindowStyle Minimized

    Info "Attente du demarrage complet (cela peut prendre plusieurs minutes)..."
    $limite = (Get-Date).AddMinutes(8)
    $demarre = $false
    while ((Get-Date) -lt $limite) {
        Start-Sleep -Seconds 5
        $liste = @(AppareilsConnectes)
        if ($liste.Count -eq 0) { continue }
        # L'appareil est visible d'adb bien avant d'avoir fini de demarrer.
        # C'est sys.boot_completed qui fait foi.
        $pret = (& $adb -s $liste[0] shell getprop sys.boot_completed) 2>$null
        if ("$pret".Trim() -eq "1") { $demarre = $true; break }
    }
    $appareils = @(AppareilsConnectes)
    if (-not $demarre -or $appareils.Count -eq 0) {
        throw "L'emulateur n'a pas fini de demarrer dans le temps imparti."
    }
}

$cible = $appareils[0]
$estEmulateur = $cible -like "emulator-*"
Info "Appareil : $cible ($(if ($estEmulateur) { 'emulateur' } else { 'telephone reel' }))"

# ---------------------------------------------------------------------------
# 5. Adresse du backend vue depuis l'appareil
#
# 127.0.0.1 designe l'appareil lui-meme, jamais le PC. L'emulateur joint l'hote
# par 10.0.2.2 ; un telephone reel passe par l'adresse du PC sur le wifi.
# ---------------------------------------------------------------------------
Etape "Configuration de l'application"

if ($estEmulateur) {
    $hote = "10.0.2.2"
} else {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL" -and $_.IPAddress -notlike "169.*" } |
        Select-Object -First 1).IPAddress
    if (-not $ip) { throw "Adresse IP locale introuvable." }
    $hote = $ip
    Info "Le telephone doit etre sur le meme wifi que ce PC."
}

$contenu = @"
# Genere par demarrer.ps1
EXPO_PUBLIC_SUPABASE_URL=http://${hote}:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=$cleAnon
"@
Set-Content -Path (Join-Path $mobile ".env") -Value $contenu -Encoding utf8
Info "Backend joignable par l'application sur http://${hote}:54321"

# ---------------------------------------------------------------------------
# 6. Java
#
# Gradle ne supporte pas encore Java 22, courant en installation systeme. Celui
# livre avec Android Studio (JDK 21) convient.
# ---------------------------------------------------------------------------
$jbr = "C:\Program Files\Android\Android Studio\jbr"
if (Test-Path $jbr) {
    $env:JAVA_HOME = $jbr
    Info "JAVA_HOME pointe sur le JDK d'Android Studio."
} else {
    Souci "JDK d'Android Studio introuvable : le build utilisera le Java du systeme."
}

# ---------------------------------------------------------------------------
# 7. Position de l'appareil
#
# Un emulateur neuf se croit en Californie. L'application cherche dans un rayon
# d'un kilometre : elle afficherait « aucun commerce trouve » alors que tout
# fonctionne. On le place a Hedzranawoe, ou se trouve le jeu de donnees.
# ---------------------------------------------------------------------------
if ($estEmulateur) {
    try {
        & $adb emu geo fix 1.2360 6.1780 2>&1 | Out-Null
        Info "Emulateur place a Hedzranawoe, Lome."
    } catch {
        Souci "Position non appliquee. A faire a la main : adb emu geo fix 1.2360 6.1780"
    }
}

# ---------------------------------------------------------------------------
# 8. Compilation et lancement
# ---------------------------------------------------------------------------
Etape "Compilation de l'application"

# On cible l'appareil par ANDROID_SERIAL plutot que par --device : cette option
# attend le NOM de l'AVD pour un emulateur et le numero de serie pour un
# telephone, alors qu'adb ne connait que le numero de serie. La variable
# d'environnement est comprise par les deux.
$env:ANDROID_SERIAL = $cible

Push-Location $mobile
try {
    if ($Production) {
        # Build de production : le JavaScript est empaquete DANS l'apk. Aucun
        # serveur en face, l'application se lance depuis son icone comme
        # n'importe quelle autre. C'est la forme a installer sur le telephone
        # d'un ambassadeur qui part en tournee.
        Info "Build de production : le code est empaquete dans l'application."
        Info "Aucun serveur ne sera necessaire ensuite."
        npx expo run:android --variant release
    } else {
        # Build de developpement : l'application va chercher son code sur Metro
        # a chaque lancement, ce qui permet le rechargement instantane. Sans
        # Metro en face, elle affiche un ecran vide -- c'est normal.
        Info "Build de developpement : Metro doit rester ouvert."
        Info "Pour une application autonome, relancez avec -Production."
        npx expo run:android
    }
} finally {
    Pop-Location
}
