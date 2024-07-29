# 임시 폴더 생성
$tempDir = "temp_for_zip"
mkdir $tempDir

# 필요한 디렉터리와 파일을 복사 (node_modules 제외)
Get-ChildItem -Path . -Exclude node_modules, .git, *.zip | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

# 압축 파일 생성
Compress-Archive -Path "$tempDir\*" -DestinationPath "google_map_game_full.zip" -Force

# 임시 폴더 삭제
Remove-Item -Recurse -Force $tempDir
