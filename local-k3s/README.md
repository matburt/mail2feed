Local k3s Helm values and secrets (temporary)

This folder contains personal/local deployment configuration for k3s. It is ignored by Git via the repo .gitignore.

Files:
- values-k3s.yaml — Helm values for local k3s using an external PostgreSQL instance.
- secret-external-db.yaml — Kubernetes Secret with `connection-string` and `password`.

Usage:
- Create the namespace (first time only):
  kubectl create namespace mail2feed

- Create/Update the Secret in the `mail2feed` namespace:
  kubectl apply -n mail2feed -f local-k3s/secret-external-db.yaml

- Install/upgrade Helm release into the `mail2feed` namespace using the values file:
  helm upgrade --install mail2feed k8s/mail2feed/ -n mail2feed -f local-k3s/values-k3s.yaml --create-namespace

Notes:
- The chart uses the Secret’s `connection-string` key to set `DATABASE_URL` for the backend.
- Internal PostgreSQL is disabled; the chart will not attempt to create its own DB.
- Rotate credentials by updating and reapplying `secret-external-db.yaml`.
