# FACZIL - abre el programa en su propia ventana.
# Sirve los archivos de esta carpeta solo para esta PC (localhost) y se apaga al cerrar la ventana.
# Los datos del negocio se guardan en la subcarpeta "datos". No la borres.

$ErrorActionPreference = 'Stop'
$raiz   = Split-Path -Parent $MyInvocation.MyCommand.Path
$datos  = Join-Path $raiz 'datos'
$puerto = 48620   # No lo cambies: los datos guardados dependen de esta dirección.
$url    = "http://localhost:$puerto/"

$navegador = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $navegador) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show('FACZIL necesita Microsoft Edge o Google Chrome instalado.', 'FACZIL') | Out-Null
  exit 1
}

$servidor = New-Object System.Net.HttpListener
$servidor.Prefixes.Add($url)
$yaAbierto = $false
try { $servidor.Start() } catch { $yaAbierto = $true }   # el puerto ocupado significa que FACZIL ya está abierto

$ventana = Start-Process -FilePath $navegador -PassThru -ArgumentList @(
  "--app=$url", "--user-data-dir=`"$datos`"", '--no-first-run', '--no-default-browser-check'
)
if ($yaAbierto) { exit 0 }   # la otra copia sigue sirviendo; aquí solo se trae la ventana al frente

$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.ico' = 'image/x-icon'; '.webmanifest' = 'application/manifest+json'
}
# Solo se entregan los archivos de la app: nunca "datos", ni este script, ni nada fuera de la carpeta.
$permitido = '^(index\.html|manifest\.webmanifest|sw\.js|(css|js|icons)/[\w./-]+)$'

function Responder($ctx) {
  $res = $ctx.Response
  try {
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
    if ($ruta -eq '') { $ruta = 'index.html' }
    $archivo = Join-Path $raiz ($ruta -replace '/', '\')
    if ($ruta -notmatch $permitido -or $ruta.Contains('..') -or -not (Test-Path -LiteralPath $archivo -PathType Leaf)) {
      $res.StatusCode = 404
    } else {
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $tipo = $tipos[[IO.Path]::GetExtension($archivo).ToLower()]
      if (-not $tipo) { $tipo = 'application/octet-stream' }
      $res.ContentType = $tipo
      $res.Headers['Cache-Control'] = 'no-cache'
      $res.ContentLength64 = $bytes.Length
      if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
    }
  } catch {
    try { $res.StatusCode = 500 } catch {}
  } finally {
    try { $res.Close() } catch {}
  }
}

$espera = $servidor.GetContextAsync()
while ($true) {
  if ($espera.Wait(400)) {
    $ctx = $espera.Result
    $espera = $servidor.GetContextAsync()
    Responder $ctx
  } elseif ($ventana.HasExited) {
    break
  }
}
$servidor.Stop()
