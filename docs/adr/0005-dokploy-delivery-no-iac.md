# Delivery stays on GitHub Actions and Dokploy; no Kubernetes tooling, no IaC

CI runs on GitHub Actions and Dokploy deploys by git push to one Hetzner VPS
running docker compose behind Traefik. We are not adopting ArgoCD, Helm,
Terraform or OpenTofu.

ArgoCD and Helm both presuppose Kubernetes, which this project does not run;
ArgoCD alone idles near 1 GB on a box with ~4 GB free and no swap. Terraform or
OpenTofu would describe a single server that `hetzner-create`'s cloud-init
already provisions reproducibly, while the compose files in `docker/` already
describe the application layer declaratively.

## Consequences

Revisit IaC (OpenTofu, the open-source Terraform fork) when a second server
appears, and Kubernetes tooling only when a workload outgrows one VPS.
