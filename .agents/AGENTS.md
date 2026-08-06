# Repository Versioning & Commit Message Guidelines

- Whenever creating git commits for **Frontend (`client`)** or **Backend (`server`)**:
  1. Always include the version tag at the beginning of the commit message (e.g., `[v1.0.1] fix: resolve homework deletion issue` or `v1.0.1: feat: add notice modal`).
  2. Create a corresponding Git Tag (`git tag -a vX.Y.Z -m "..."`).
  3. Push both the commits and the tags to the remote repository (`git push origin main --tags`).
