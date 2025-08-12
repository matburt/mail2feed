{{/*
Expand the name of the chart.
*/}}
{{- define "mail2feed.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "mail2feed.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "mail2feed.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "mail2feed.labels" -}}
helm.sh/chart: {{ include "mail2feed.chart" . }}
{{ include "mail2feed.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "mail2feed.selectorLabels" -}}
app.kubernetes.io/name: {{ include "mail2feed.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "mail2feed.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "mail2feed.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the database URL
*/}}
{{- define "mail2feed.databaseUrl" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "postgres://%s:%s@%s-postgresql:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "mail2feed.fullname" .) .Values.postgresql.auth.database }}
{{- else }}
{{- $params := "" }}
{{- if .Values.externalDatabase.sslmode }}
{{- $params = printf "?sslmode=%s" .Values.externalDatabase.sslmode }}
{{- end }}
{{- if .Values.externalDatabase.connectionParams }}
{{- if $params }}
{{- $params = printf "%s&%s" $params .Values.externalDatabase.connectionParams }}
{{- else }}
{{- $params = printf "?%s" .Values.externalDatabase.connectionParams }}
{{- end }}
{{- end }}
{{- printf "postgres://%s:PASSWORD_PLACEHOLDER@%s:%s/%s%s" .Values.externalDatabase.username .Values.externalDatabase.host (.Values.externalDatabase.port | toString) .Values.externalDatabase.database $params }}
{{- end }}
{{- end }}

{{/*
Get the database password secret name
*/}}
{{- define "mail2feed.databaseSecretName" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql" (include "mail2feed.fullname" .) }}
{{- else if .Values.externalDatabase.existingSecret }}
{{- .Values.externalDatabase.existingSecret }}
{{- else }}
{{- printf "%s-external-db" (include "mail2feed.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Get the database password secret key
*/}}
{{- define "mail2feed.databaseSecretKey" -}}
{{- if .Values.postgresql.enabled }}
password
{{- else }}
{{- .Values.externalDatabase.existingSecretPasswordKey }}
{{- end }}
{{- end }}