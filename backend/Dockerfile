# バックエンド（Spring Boot）のコンテナイメージ。AWS の ECS Fargate で動かす（インフラ設計書 7.）。
#
#   作成: docker build -t taskmanagement-backend backend   （リポジトリルートで実行）
#
# 2 段階に分けて作る（マルチステージビルド）。
#   1 段目（build）：JDK と Gradle で実行用の jar を作る
#   2 段目（実行用）：JRE と jar だけを入れる。JDK や Gradle、ソースコードを含めないので、イメージが小さくなる

# --- 1 段目：jar を作る --------------------------------------------------------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# 依存ライブラリの取得を、ソースコードのコピーより先に行う。
# Docker はこの順で結果をキャッシュするため、ソースコードだけを変えたときは取得をやり直さずに済む。
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
# Windows で取得したリポジトリでは gradlew に実行権限が付かないため、ここで付ける。
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null

COPY config config
COPY src src
# テストと Checkstyle は手元の ./gradlew check で通してからイメージを作る前提のため、ここでは jar だけを作る。
# bootJar が作る実行用の jar を、名前を固定して取り出す（-plain.jar は実行用ではない）。
RUN ./gradlew --no-daemon bootJar \
    && find build/libs -name '*.jar' ! -name '*-plain.jar' -exec cp {} app.jar \;

# --- 2 段目：実行用 ------------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# root 以外のユーザーで動かす。コンテナが乗っ取られたときの被害を小さくするため。
RUN useradd --system --uid 10001 --no-create-home app
COPY --from=build /workspace/app.jar app.jar
USER app

# Spring Boot の既定のポート（CLAUDE.md 6.、インフラ設計書 7.1）。
EXPOSE 8080

# Java が使うメモリの上限を、コンテナのメモリ（1 GB）の 75% にする。
# 既定（25%）のままだと、割り当てたメモリの大半が使われない。
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
