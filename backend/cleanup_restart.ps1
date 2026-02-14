Remove-Item repro_chat.py, repro_output.txt, error_log.txt, source_dump.txt, inspect_service.py, check_models.py, list_models.py, valid_models.txt, check_version.py, output_check.txt, models.txt -ErrorAction SilentlyContinue

$port = 8001
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcp) {
    echo "Stopping process on port $port..."
    Stop-Process -Id $tcp.OwningProcess -Force
    Start-Sleep -Seconds 2
} else {
    echo "No process found on port $port."
}

echo "Starting server..."
Start-Process uvicorn -ArgumentList "app.main:app --reload --port 8001" -NoNewWindow
echo "Server started."
