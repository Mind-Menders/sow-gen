# Docker Image Push Helper Script
# This script helps you tag and push your Docker image to Docker Hub

param(
    [Parameter(Mandatory=$true)]
    [string]$DockerHubUsername,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Docker Image Push Helper" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if user is logged in
Write-Host "Checking Docker login status..." -ForegroundColor Yellow
$loginCheck = docker info 2>&1 | Select-String "Username"
if (-not $loginCheck) {
    Write-Host "You are not logged in to Docker Hub." -ForegroundColor Yellow
    Write-Host "Logging in to Docker Hub..." -ForegroundColor Yellow
    Write-Host ""
    
    docker login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Docker login failed" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Docker login successful" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Docker login verified" -ForegroundColor Green
    Write-Host ""
}

# Define image names
$localImage = "sow-gen-app"
$DockerHubUsername="vharry"
$remoteImage = "$DockerHubUsername/sow-gen-app"

# Tag the image
Write-Host "Tagging image..." -ForegroundColor Yellow
Write-Host "  Local: $localImage" -ForegroundColor Gray
$remoteMsg = "  Remote: " + $remoteImage + ":" + $Version
Write-Host $remoteMsg -ForegroundColor Gray

docker tag $localImage ($remoteImage + ":" + $Version)
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to tag image" -ForegroundColor Red
    exit 1
}

Write-Host "Image tagged successfully" -ForegroundColor Green
Write-Host ""

# Also tag as 'latest' if version is specified
if ($Version -ne "latest") {
    Write-Host "Also tagging as 'latest'..." -ForegroundColor Yellow
    docker tag $localImage ($remoteImage + ":latest")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to tag as latest" -ForegroundColor Red
        exit 1
    }
    Write-Host "Tagged as latest" -ForegroundColor Green
    Write-Host ""
}

# Push the image
Write-Host "Pushing image to Docker Hub..." -ForegroundColor Yellow
Write-Host "This may take several minutes depending on your internet connection." -ForegroundColor Gray
Write-Host ""

docker push ($remoteImage + ":" + $Version)
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to push image" -ForegroundColor Red
    exit 1
}

$successMsg = "Successfully pushed " + $remoteImage + ":" + $Version
Write-Host $successMsg -ForegroundColor Green
Write-Host ""

# Push latest if version was specified
if ($Version -ne "latest") {
    Write-Host "Pushing 'latest' tag..." -ForegroundColor Yellow
    docker push ($remoteImage + ":latest")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push latest tag" -ForegroundColor Red
        exit 1
    }
    $latestMsg = "Successfully pushed " + $remoteImage + ":latest"
    Write-Host $latestMsg -ForegroundColor Green
    Write-Host ""
}

# Show summary
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SUCCESS! Image Published" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your image is now available at:" -ForegroundColor White
Write-Host "  https://hub.docker.com/r/$DockerHubUsername/sow-gen-app" -ForegroundColor Cyan
Write-Host ""
Write-Host "To deploy on another server, use:" -ForegroundColor White
$pullMsg = "  docker pull " + $remoteImage + ":" + $Version
Write-Host $pullMsg -ForegroundColor Gray
Write-Host ""
Write-Host "Or update your docker-compose.yml:" -ForegroundColor White
Write-Host "  services:" -ForegroundColor Gray
Write-Host "    app:" -ForegroundColor Gray
$imageMsg = "      image: " + $remoteImage + ":" + $Version
Write-Host $imageMsg -ForegroundColor Gray
Write-Host ""
