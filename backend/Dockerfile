FROM golang:1.25 AS build

WORKDIR /usr/src/backend

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -a -o /app/server ./cmd

EXPOSE 8080
ENTRYPOINT ["/app/server"]