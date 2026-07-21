$env:Path = "C:\Users\15294\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:Path"
& "C:\Users\15294\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd" --dir "$PSScriptRoot\..\frontend" dev --host 127.0.0.1
