param(
    [ValidateRange(1024, 65535)]
    [int]$Porta = 8000
)

$siteRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$servidor = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Porta)
$tipos = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
}

function Enviar-Resposta {
    param(
        [System.Net.Sockets.NetworkStream]$Fluxo,
        [int]$Status,
        [string]$Descricao,
        [string]$Tipo,
        [byte[]]$Conteudo,
        [bool]$SomenteCabecalho = $false
    )

    $cabecalho = "HTTP/1.1 $Status $Descricao`r`nContent-Type: $Tipo`r`nContent-Length: $($Conteudo.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $bytesCabecalho = [System.Text.Encoding]::ASCII.GetBytes($cabecalho)
    $Fluxo.Write($bytesCabecalho, 0, $bytesCabecalho.Length)
    if (-not $SomenteCabecalho -and $Conteudo.Length -gt 0) {
        $Fluxo.Write($Conteudo, 0, $Conteudo.Length)
    }
}

try {
    $servidor.Start()
    $endereco = "http://localhost:$Porta/"
    Write-Host ''
    Write-Host 'PDV Pro iniciado com sucesso!' -ForegroundColor Green
    Write-Host "Acesse: $endereco" -ForegroundColor Cyan
    Write-Host 'Para encerrar, volte a esta janela e pressione Ctrl+C.' -ForegroundColor Yellow
    Write-Host ''
    Start-Process $endereco

    while ($true) {
        $cliente = $servidor.AcceptTcpClient()
        try {
            $fluxo = $cliente.GetStream()
            $leitor = [System.IO.StreamReader]::new($fluxo, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $primeiraLinha = $leitor.ReadLine()
            while ($leitor.ReadLine()) { }

            if ($primeiraLinha -notmatch '^(GET|HEAD)\s+([^\s]+)\s+HTTP/') {
                $erro = [System.Text.Encoding]::UTF8.GetBytes('Requisição inválida.')
                Enviar-Resposta -Fluxo $fluxo -Status 400 -Descricao 'Bad Request' -Tipo 'text/plain; charset=utf-8' -Conteudo $erro
                continue
            }

            $metodo = $Matches[1]
            $alvo = $Matches[2]
            $caminhoUrl = ([System.Uri]::new("http://localhost$alvo")).AbsolutePath
            $caminhoUrl = [System.Uri]::UnescapeDataString($caminhoUrl)
            if ($caminhoUrl -eq '/') { $caminhoUrl = '/index.html' }

            $relativo = $caminhoUrl.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $arquivo = [System.IO.Path]::GetFullPath((Join-Path $siteRoot $relativo))
            $prefixoPermitido = $siteRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
            $permitido = $arquivo.StartsWith($prefixoPermitido, [System.StringComparison]::OrdinalIgnoreCase)

            if (-not $permitido -or -not [System.IO.File]::Exists($arquivo)) {
                $erro = [System.Text.Encoding]::UTF8.GetBytes('Arquivo não encontrado.')
                Enviar-Resposta -Fluxo $fluxo -Status 404 -Descricao 'Not Found' -Tipo 'text/plain; charset=utf-8' -Conteudo $erro -SomenteCabecalho ($metodo -eq 'HEAD')
                continue
            }

            $extensao = [System.IO.Path]::GetExtension($arquivo).ToLowerInvariant()
            $tipo = if ($tipos.ContainsKey($extensao)) { $tipos[$extensao] } else { 'application/octet-stream' }
            $conteudo = [System.IO.File]::ReadAllBytes($arquivo)
            Enviar-Resposta -Fluxo $fluxo -Status 200 -Descricao 'OK' -Tipo $tipo -Conteudo $conteudo -SomenteCabecalho ($metodo -eq 'HEAD')
        }
        catch {
            Write-Warning "Falha ao atender uma solicitação: $($_.Exception.Message)"
        }
        finally {
            $cliente.Close()
        }
    }
}
catch {
    Write-Host "Não foi possível iniciar o PDV na porta $Porta." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Tente novamente usando outra porta, por exemplo:' -ForegroundColor Yellow
    Write-Host 'powershell -ExecutionPolicy Bypass -File .\iniciar-pdv.ps1 -Porta 8080' -ForegroundColor Cyan
    Read-Host 'Pressione Enter para fechar'
}
finally {
    $servidor.Stop()
}
