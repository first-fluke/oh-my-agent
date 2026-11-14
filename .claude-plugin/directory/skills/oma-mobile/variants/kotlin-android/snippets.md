# Mobile Agent - Code Snippets (Kotlin Android Native)

Copy-paste ready patterns. Use these as starting points; adapt package names, module names, and versions to the specific project.
Always cache decoded domain models at the Repository layer — never in a Ktor plugin or an OkHttp interceptor.

Package placeholder: `com.example.app`. Generated packages: `com.example.generated.{api,model,infrastructure}`.

---

## §1. Gradle wiring: OpenAPI Generator (`kotlin` / `jvm-ktor`) + Ktor + OkHttp engine

Versions live in the version catalog and are deliberately absent here: keep the
project's existing pins, and take a new entry's version from that library's current
stable release. `org.openapi.generator` is always an **exact** version, never a range —
the generated constructor parameters in §3 follow it.

```kotlin
// settings.gradle.kts
rootProject.name = "ExampleApp"
include(":app", ":api-client")
```

```toml
# gradle/libs.versions.toml — coordinates only
[versions]
# One entry per `version.ref` below, plus compileSdk / targetSdk (latest stable API level).
# The values are the project's pins; this reference lists none on purpose.

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
kotlin-serialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
openapi-generator = { id = "org.openapi.generator", version.ref = "openapi-generator" }

[libraries]
compose-bom = { module = "androidx.compose:compose-bom", version.ref = "compose-bom" }
compose-ui = { module = "androidx.compose.ui:ui" }                       # BOM-managed
compose-material3 = { module = "androidx.compose.material3:material3" }
compose-ui-test-junit4 = { module = "androidx.compose.ui:ui-test-junit4" }
compose-ui-test-manifest = { module = "androidx.compose.ui:ui-test-manifest" }
activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activity" }
lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycle" }
lifecycle-runtime-compose = { module = "androidx.lifecycle:lifecycle-runtime-compose", version.ref = "lifecycle" }
navigation-compose = { module = "androidx.navigation:navigation-compose", version.ref = "navigation" }
hilt-lifecycle-viewmodel-compose = { module = "androidx.hilt:hilt-lifecycle-viewmodel-compose", version.ref = "androidx-hilt" }
hilt-android = { module = "com.google.dagger:hilt-android", version.ref = "hilt" }
hilt-compiler = { module = "com.google.dagger:hilt-compiler", version.ref = "hilt" }
room-runtime = { module = "androidx.room3:room3-runtime", version.ref = "room" }
room-compiler = { module = "androidx.room3:room3-compiler", version.ref = "room" }
coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "coroutines" }
coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines" }
serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "serialization" }
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-auth = { module = "io.ktor:ktor-client-auth", version.ref = "ktor" }
ktor-client-logging = { module = "io.ktor:ktor-client-logging", version.ref = "ktor" }
ktor-client-mock = { module = "io.ktor:ktor-client-mock", version.ref = "ktor" }
junit = { module = "junit:junit", version.ref = "junit" }
turbine = { module = "app.cash.turbine:turbine", version.ref = "turbine" }
```

```kotlin
// build.gradle.kts (root) — declare every plugin once, apply per module
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.openapi.generator) apply false       // exact pin; never a range
}
```

```kotlin
// app/build.gradle.kts
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.openapi.generator)
}

android {
    namespace = "com.example.app"
    compileSdk = libs.versions.compileSdk.get().toInt()      // latest stable API level
    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 26
        targetSdk = libs.versions.targetSdk.get().toInt()
        buildConfigField("String", "API_BASE_URL",
            "\"${providers.gradleProperty("apiBaseUrl").orElse("http://10.0.2.2:8000").get()}\"")
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}

dependencies {
    implementation(project(":api-client"))

    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.activity.compose)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
    implementation(libs.navigation.compose)
    implementation(libs.hilt.lifecycle.viewmodel.compose)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    implementation(libs.room.runtime)
    ksp(libs.room.compiler)

    implementation(libs.coroutines.android)
    implementation(libs.serialization.json)

    // Ktor: the generated client needs core + JSON; the ENGINE is this module's choice.
    implementation(libs.ktor.client.core)
    implementation(libs.ktor.client.okhttp)                  // engine on device
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    implementation(libs.ktor.client.auth)                    // Auth plugin (§3)
    implementation(libs.ktor.client.logging)                 // Logging plugin (§3)

    testImplementation(libs.junit)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.ktor.client.mock)                // engine in tests
    androidTestImplementation(composeBom)
    androidTestImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)
}

// Pinned generator produces API/model/infrastructure sources from the committed server contract.
openApiGenerate {
    generatorName.set("kotlin")
    library.set("jvm-ktor")
    inputSpec.set(file("../../api/openapi.json").absolutePath)          // adapt to {api_spec}
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.example.generated.api")
    modelPackage.set("com.example.generated.model")
    packageName.set("com.example.generated")                            // → …generated.infrastructure
    configOptions.set(mapOf(
        "serializationLibrary" to "kotlinx_serialization",
        "dateLibrary" to "string",
        "enumPropertyNaming" to "UPPERCASE",
        "hideGenerationTimestamp" to "true",
        "omitGradleWrapper" to "true",
        "sourceFolder" to "src/main/kotlin",
    ))
    // OpenAPI primitive unions are JSON scalars — never empty generated classes or Any.
    schemaMappings.set(mapOf(
        "Value" to "kotlinx.serialization.json.JsonPrimitive",
    ))
    globalProperties.set(mapOf(
        "apiDocs" to "false", "modelDocs" to "false",
        "apiTests" to "false", "modelTests" to "false",
    ))
}
tasks.named("preBuild") { dependsOn(tasks.named("openApiGenerate")) }
```

```kotlin
// api-client/build.gradle.kts — JVM module: compiles the generated sources and hosts contract tests
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.serialization)
}
kotlin {
    jvmToolchain(17)
    sourceSets.getByName("main").kotlin.srcDir("../app/build/generated/openapi/src/main/kotlin")
}
dependencies {
    implementation(libs.serialization.json)
    implementation(libs.ktor.client.core)                    // no engine here on purpose
    implementation(libs.ktor.client.content.negotiation)
    implementation(libs.ktor.serialization.kotlinx.json)
    testImplementation(libs.ktor.client.mock)
    testImplementation(libs.coroutines.test)
    testImplementation(libs.junit)
}
tasks.named("compileKotlin") { dependsOn(":app:openApiGenerate") }
```

The contract tests need no emulator. This command generates sources and compiles, so
run it only when the user or the active workflow asks for a test run:

```bash
./gradlew :app:openApiGenerate :api-client:test
```

---

## §2. Shared `Json` codec (DI graph and tests use the same instance)

```kotlin
// api-client/src/main/kotlin/com/example/client/ApiJson.kt
package com.example.client

import java.math.BigDecimal
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerializationException
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.*
import kotlinx.serialization.modules.SerializersModule
import kotlinx.serialization.modules.contextual

/** Single codec shared by the Hilt graph and the generated-client contract tests. */
object ApiJson {
    fun create(): Json = Json {
        ignoreUnknownKeys = true          // additive server fields never break old clients
        encodeDefaults = true
        explicitNulls = true
        // jvm-ktor marks OpenAPI `number` fields @Contextual BigDecimal; kotlinx has no built-in.
        serializersModule = SerializersModule { contextual(BigDecimal::class, JsonDecimalSerializer) }
    }
}

/** Exact JSON numbers — never quoted strings, never Double round-trips. */
@OptIn(ExperimentalSerializationApi::class)
private object JsonDecimalSerializer : KSerializer<BigDecimal> {
    override val descriptor = PrimitiveSerialDescriptor("java.math.BigDecimal", PrimitiveKind.DOUBLE)
    override fun deserialize(decoder: Decoder): BigDecimal {
        val input = decoder as? JsonDecoder ?: throw SerializationException("Expected JSON decoder")
        val number = input.decodeJsonElement() as? JsonPrimitive ?: throw SerializationException("Expected JSON number")
        if (number.isString) throw SerializationException("Expected JSON number")
        return number.content.toBigDecimalOrNull() ?: throw SerializationException("Expected JSON number")
    }
    override fun serialize(encoder: Encoder, value: BigDecimal) {
        val output = encoder as? JsonEncoder ?: throw SerializationException("Expected JSON encoder")
        output.encodeJsonElement(JsonUnquotedLiteral(value.toPlainString()))
    }
}
```

---

## §3. Hilt network module: generated API over Ktor with the OkHttp engine

```kotlin
// app/src/main/java/com/example/app/di/NetworkModule.kt
package com.example.app.di

import com.example.app.BuildConfig
import com.example.app.data.auth.TokenStore
import com.example.client.ApiJson
import com.example.generated.api.TodosApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.header
import io.ktor.serialization.kotlinx.json.json
import java.util.Locale
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.serialization.json.Json

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideJson(): Json = ApiJson.create()

    /** The engine is the ONLY Android-specific piece. Tests swap it for MockEngine. */
    @Provides @Singleton
    fun provideEngine(): HttpClientEngine = OkHttp.create {
        config {                                   // native OkHttpClient.Builder
            connectTimeout(12, TimeUnit.SECONDS)
            readTimeout(20, TimeUnit.SECONDS)
            retryOnConnectionFailure(true)
        }
        // addInterceptor(...) for OkHttp-level concerns (certificate pinning, Sentry/OTel).
    }

    /**
     * Cross-cutting transport concerns only — JSON, auth, timeouts, headers, logging. Never caching.
     * A plain function, not a binding: every generated *Api below receives the same block.
     */
    private fun clientConfig(tokenStore: TokenStore, codec: Json): (HttpClientConfig<*>) -> Unit = { config ->
        config.expectSuccess = false              // generated HttpResponse<T>.success carries the status
        // With kotlinx_serialization the generated ApiClient installs ContentNegotiation
        // without a converter; register the shared codec here.
        config.install(ContentNegotiation) { json(codec) }
        config.install(HttpTimeout) { requestTimeoutMillis = 20_000 }
        config.install(Auth) {
            bearer {
                loadTokens { tokenStore.current()?.let { BearerTokens(it.access, it.refresh) } }
                refreshTokens { tokenStore.refresh()?.let { BearerTokens(it.access, it.refresh) } }
            }
        }
        config.defaultRequest { header("Accept-Language", Locale.getDefault().toLanguageTag()) }
        if (BuildConfig.DEBUG) config.install(Logging) { level = LogLevel.HEADERS }
    }

    /**
     * One generated *Api per OpenAPI tag. The jvm-ktor template exposes `baseUrl` +
     * `httpClientEngine` + `httpClientConfig` constructor parameters, so no template fork
     * is needed. Parameter names follow the pinned generator version — confirm against
     * build/generated/openapi/.../infrastructure/ApiClient.kt once.
     */
    @Provides @Singleton
    fun provideTodosApi(
        engine: HttpClientEngine,
        tokenStore: TokenStore,
        json: Json,
    ): TodosApi = TodosApi(
        baseUrl = BuildConfig.API_BASE_URL.trimEnd('/'),
        httpClientEngine = engine,
        httpClientConfig = clientConfig(tokenStore, json),
    )
}
```

---

## §4. Repository wrapping the generated client (no hand-rolled HTTP)

```kotlin
// app/src/main/java/com/example/app/data/ApiFailure.kt
package com.example.app.data

sealed class ApiFailure(message: String) : Exception(message) {
    class NotFound : ApiFailure("Resource not found")
    class Conflict(val detail: String) : ApiFailure(detail)
    class Unauthorized : ApiFailure("Session expired")
    class Server(val status: Int) : ApiFailure("Server error $status")
    class Network(cause: Throwable) : ApiFailure(cause.message ?: "Network error") { init { initCause(cause) } }
}
```

```kotlin
// app/src/main/java/com/example/app/data/TodoRepository.kt
package com.example.app.data

import com.example.generated.api.TodosApi
import com.example.generated.infrastructure.HttpResponse
import com.example.generated.model.CreateTodoRequest
import com.example.generated.model.Todo
import io.ktor.client.statement.bodyAsText
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Interface seam the view models depend on, so the repository is swappable for a
 * fake in unit tests (no mocking library, no `open` class).
 */
interface TodoDataSource {
    suspend fun list(): List<Todo>
    suspend fun get(id: String): Todo
    suspend fun create(title: String): Todo
    suspend fun toggle(id: String): Todo
    suspend fun delete(id: String)
}

/** Every HTTP operation is generated from the OpenAPI spec; this class owns mapping and errors only. */
@Singleton
class TodoRepository @Inject constructor(
    private val api: TodosApi,
    private val json: Json,
) : TodoDataSource {
    override suspend fun list(): List<Todo> = call { api.listTodos() }
    override suspend fun get(id: String): Todo = call { api.getTodo(id) }
    override suspend fun create(title: String): Todo = call { api.createTodo(CreateTodoRequest(title = title)) }
    override suspend fun toggle(id: String): Todo = call { api.toggleTodo(id) }
    override suspend fun delete(id: String) { call { api.deleteTodo(id) } }

    /** Unwraps the generated HttpResponse<T>: status → typed failure, IOException → Network. */
    private suspend fun <T> call(request: suspend () -> HttpResponse<T>): T {
        val response = try {
            request()
        } catch (cancelled: CancellationException) {
            throw cancelled                           // never swallow structured cancellation
        } catch (io: IOException) {
            throw ApiFailure.Network(io)
        }
        if (!response.success) {
            val detail = runCatching {
                json.parseToJsonElement(response.response.bodyAsText()).jsonObject["detail"]?.jsonPrimitive?.content
            }.getOrNull().orEmpty()
            throw when (response.status) {
                401 -> ApiFailure.Unauthorized()
                404 -> ApiFailure.NotFound()
                409 -> ApiFailure.Conflict(detail)
                else -> ApiFailure.Server(response.status)
            }
        }
        return response.body()
    }
}
```

```kotlin
// app/src/main/java/com/example/app/di/DataModule.kt
@Module @InstallIn(SingletonComponent::class)
abstract class DataModule {
    /** View models ask for the interface; Hilt supplies the generated-client repository. */
    @Binds abstract fun bindTodoDataSource(impl: TodoRepository): TodoDataSource
}
```

---

## §5. `@HiltViewModel` with a single `StateFlow<UiState>`

```kotlin
// app/src/main/java/com/example/app/ui/todos/TodoListViewModel.kt
package com.example.app.ui.todos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.data.ApiFailure
import com.example.app.data.TodoDataSource
import com.example.generated.model.Todo
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface TodoListUiState {
    data object Loading : TodoListUiState
    data class Error(val message: String, val retryable: Boolean = true) : TodoListUiState
    data class Content(val todos: List<Todo>, val busy: Boolean = false) : TodoListUiState
}

@HiltViewModel
class TodoListViewModel @Inject constructor(
    private val repository: TodoDataSource,          // interface seam (§4), never the concrete class
) : ViewModel() {

    private val _state = MutableStateFlow<TodoListUiState>(TodoListUiState.Loading)
    val state: StateFlow<TodoListUiState> = _state.asStateFlow()

    private var loadJob: Job? = null

    init { load() }

    fun load() {
        loadJob?.cancel()                            // one in-flight load at a time
        loadJob = viewModelScope.launch {
            _state.value = TodoListUiState.Loading
            _state.value = try {
                TodoListUiState.Content(repository.list())
            } catch (failure: ApiFailure) {
                TodoListUiState.Error(failure.toUserMessage(), retryable = failure !is ApiFailure.Unauthorized)
            }
        }
    }

    fun toggle(id: String) = mutate { repository.toggle(id) }
    fun delete(id: String) = mutate { repository.delete(id) }
    fun create(title: String) = mutate { repository.create(title.trim()) }

    private fun mutate(block: suspend () -> Unit) {
        val current = _state.value as? TodoListUiState.Content ?: return
        viewModelScope.launch {
            _state.value = current.copy(busy = true)
            try {
                block()
                _state.value = TodoListUiState.Content(repository.list())
            } catch (failure: ApiFailure) {
                _state.update { TodoListUiState.Error(failure.toUserMessage()) }
            }
        }
    }
}

private fun ApiFailure.toUserMessage(): String = when (this) {
    is ApiFailure.Network -> "You appear to be offline."
    is ApiFailure.Unauthorized -> "Please sign in again."
    is ApiFailure.NotFound -> "That item no longer exists."
    is ApiFailure.Conflict -> detail.ifBlank { "That change conflicts with the server." }
    is ApiFailure.Server -> "Something went wrong on our side. Try again."
}
```

`viewModelScope` is cancelled in `onCleared()`, so every network call is structurally bound to the screen. Never launch into `GlobalScope`.

---

## §6. Compose screen: loading / error-with-retry / empty / content

```kotlin
// app/src/main/java/com/example/app/ui/todos/TodoListScreen.kt
package com.example.app.ui.todos

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.generated.model.Todo

@Composable
fun TodoListScreen(
    onOpenDetail: (String) -> Unit,
    viewModel: TodoListViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    TodoListContent(
        state = state,
        onRetry = viewModel::load,
        onToggle = viewModel::toggle,
        onOpenDetail = onOpenDetail,
    )
}

/** Stateless: previewable and testable without Hilt. */
@Composable
fun TodoListContent(
    state: TodoListUiState,
    onRetry: () -> Unit,
    onToggle: (String) -> Unit,
    onOpenDetail: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(topBar = { TopAppBar(title = { Text("Todos") }) }, modifier = modifier) { padding ->
        Box(Modifier.padding(padding).fillMaxSize(), contentAlignment = Alignment.Center) {
            when (state) {
                TodoListUiState.Loading -> CircularProgressIndicator()
                is TodoListUiState.Error -> ErrorState(state.message, state.retryable, onRetry)
                is TodoListUiState.Content ->
                    if (state.todos.isEmpty()) EmptyState()
                    else TodoList(state.todos, state.busy, onToggle, onOpenDetail)
            }
        }
    }
}

@Composable
private fun TodoList(
    todos: List<Todo>,
    busy: Boolean,
    onToggle: (String) -> Unit,
    onOpenDetail: (String) -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize()) {
        items(todos, key = { it.id }) { todo ->
            ListItem(
                headlineContent = { Text(todo.title) },
                leadingContent = {
                    Checkbox(checked = todo.completed, enabled = !busy, onCheckedChange = { onToggle(todo.id) })
                },
                modifier = Modifier.clickable { onOpenDetail(todo.id) },
            )
        }
    }
}

@Composable
private fun ErrorState(message: String, retryable: Boolean, onRetry: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(message, style = MaterialTheme.typography.bodyLarge)
        if (retryable) Button(onClick = onRetry) { Text("Retry") }
    }
}

@Composable
private fun EmptyState() {
    Text("Nothing to do yet.", style = MaterialTheme.typography.bodyLarge)
}
```

---

## §7. Navigation Compose with type-safe `@Serializable` routes

```kotlin
// app/src/main/java/com/example/app/ui/navigation/AppNavHost.kt
package com.example.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.example.app.ui.todos.TodoDetailScreen
import com.example.app.ui.todos.TodoListScreen
import kotlinx.serialization.Serializable

@Serializable data object TodoListRoute
@Serializable data class TodoDetailRoute(val id: String)

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = TodoListRoute) {
        composable<TodoListRoute> {
            TodoListScreen(onOpenDetail = { id -> navController.navigate(TodoDetailRoute(id)) })
        }
        composable<TodoDetailRoute> { entry ->
            val route = entry.toRoute<TodoDetailRoute>()
            TodoDetailScreen(id = route.id, onBack = { navController.popBackStack() })
        }
    }
}
```

Screens receive callbacks, never the `NavController`. Predictive back is enabled by default for apps targeting API 36+; the `NavHost` handles it.

---

## §8. Repository-layer response cache (Room, stale-while-revalidate)

```kotlin
// app/src/main/java/com/example/app/data/cache/TodoCache.kt
package com.example.app.data.cache

import androidx.room3.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "todo_cache")
data class TodoCacheRow(
    @PrimaryKey val id: String,
    val title: String,
    val completed: Boolean,
    val fetchedAt: Long,          // epoch millis — explicit TTL lives in the repository
)

@Dao
interface TodoCacheDao {
    @Query("SELECT * FROM todo_cache ORDER BY title")
    fun observeAll(): Flow<List<TodoCacheRow>>

    @Query("SELECT MIN(fetchedAt) FROM todo_cache")
    suspend fun oldestFetchedAt(): Long?

    @Transaction
    suspend fun replaceAll(rows: List<TodoCacheRow>) { clear(); upsertAll(rows) }

    @Upsert suspend fun upsertAll(rows: List<TodoCacheRow>)
    @Upsert suspend fun upsert(row: TodoCacheRow)
    @Query("DELETE FROM todo_cache WHERE id = :id") suspend fun delete(id: String)
    @Query("DELETE FROM todo_cache") suspend fun clear()
}

// A disposable response cache: no schema history to export.
@Database(entities = [TodoCacheRow::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun todoCache(): TodoCacheDao
}
```

```kotlin
// app/src/main/java/com/example/app/data/CachedTodoRepository.kt
package com.example.app.data

import com.example.app.data.cache.TodoCacheDao
import com.example.app.data.cache.TodoCacheRow
import com.example.generated.model.Todo
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.time.Duration.Companion.minutes
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

/**
 * Reads: emit cached rows immediately, revalidate when stale, let Room re-emit.
 * Writes: hit the server, then upsert/delete the affected rows — never a blind refetch.
 * Cache key = operation ("listTodos") + params; TTL is explicit.
 */
@Singleton
class CachedTodoRepository(
    private val dao: TodoCacheDao,
    private val remote: TodoDataSource,            // §4 — owns HttpResponse unwrapping
    private val clock: () -> Long,                 // tests pass a fake clock here
) {
    // The injected constructor supplies the wall clock; tests call the primary one.
    @Inject constructor(dao: TodoCacheDao, remote: TodoDataSource) :
        this(dao, remote, System::currentTimeMillis)

    private val ttl = 5.minutes.inWholeMilliseconds

    fun observeTodos(): Flow<List<Todo>> = channelFlow {
        launch { revalidateIfStale() }             // concurrent with the cached rows below
        dao.observeAll()
            .map { rows -> rows.map { it.toModel() } }
            .collect { send(it) }
    }

    private suspend fun revalidateIfStale() {
        val oldest = dao.oldestFetchedAt()
        if (oldest != null && clock() - oldest < ttl) return
        try {
            val fresh = remote.list()
            dao.replaceAll(fresh.map { it.toRow(clock()) })
        } catch (failure: ApiFailure) {
            if (oldest == null) throw failure         // nothing cached → surface the error
            // warm cache → keep serving stale rows, swallow
        }
    }

    suspend fun toggle(id: String) { dao.upsert(remote.toggle(id).toRow(clock())) }
    suspend fun create(title: String) { dao.upsert(remote.create(title).toRow(clock())) }
    suspend fun delete(id: String) { remote.delete(id); dao.delete(id) }
}

private fun TodoCacheRow.toModel() = Todo(id = id, title = title, completed = completed)
private fun Todo.toRow(now: Long) = TodoCacheRow(id = id, title = title, completed = completed, fetchedAt = now)
```

```kotlin
// app/src/main/java/com/example/app/di/DatabaseModule.kt
@Module @InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton
    fun provideDb(@ApplicationContext ctx: Context): AppDatabase =
        Room.databaseBuilder<AppDatabase>(ctx, "app.db")
            .setDriver(AndroidSQLiteDriver())      // androidx.sqlite.driver, on the classpath through room3-runtime
            .build()
    @Provides fun provideTodoCache(db: AppDatabase): TodoCacheDao = db.todoCache()
}
```

A view model that renders cached data depends on an interface over
`CachedTodoRepository` (`observeTodos()` plus the write methods), bound in Hilt the
same way §4 binds `TodoDataSource` — never on the concrete class.

---

## §9. Generated-client contract test with `MockEngine` (`:api-client`, no Android)

```kotlin
// api-client/src/test/kotlin/com/example/client/GeneratedClientContractTest.kt
package com.example.client

import com.example.generated.api.TodosApi
import com.example.generated.model.CreateTodoRequest
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.http.*
import io.ktor.http.content.TextContent
import io.ktor.serialization.kotlinx.json.json
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class GeneratedClientContractTest {
    private val codec = ApiJson.create()

    /** Same wiring as the Hilt module (§3): engine injected, codec registered through httpClientConfig. */
    private fun todosApi(engine: MockEngine) = TodosApi(
        baseUrl = "http://localhost",
        httpClientEngine = engine,
        httpClientConfig = { it.install(ContentNegotiation) { json(codec) } },
    )

    @Test fun `create sends kotlinx-encoded body and decodes typed response`() = runTest {
        var sentBody = ""
        val engine = MockEngine { request ->
            assertEquals("/todos", request.url.encodedPath)
            assertEquals(HttpMethod.Post, request.method)
            sentBody = (request.body as TextContent).text
            respond(
                content = """{"id":"t1","title":"Buy milk","completed":false}""",
                status = HttpStatusCode.Created,
                headers = headersOf(HttpHeaders.ContentType, ContentType.Application.Json.toString()),
            )
        }
        val api = todosApi(engine)

        val response = api.createTodo(CreateTodoRequest(title = "Buy milk"))

        assertTrue(response.success)
        assertEquals(201, response.status)
        assertEquals("Buy milk", response.body().title)
        assertTrue(sentBody.contains("\"title\":\"Buy milk\""))
        engine.close()
    }

    @Test fun `non-2xx is surfaced through success=false, not an exception`() = runTest {
        val engine = MockEngine { respond("""{"detail":"not found"}""", HttpStatusCode.NotFound) }
        val api = todosApi(engine)

        val response = api.getTodo("missing")

        assertFalse(response.success)
        assertEquals(404, response.status)
        engine.close()
    }
}
```

Because the engine is injected, this test exercises the *real* generated code path (URL building, serialization, response unwrapping) with zero network.

---

## §10. ViewModel unit test (`runTest` + fake `TodoDataSource` + Turbine)

```kotlin
// app/src/test/java/com/example/app/ui/todos/TodoListViewModelTest.kt
package com.example.app.ui.todos

import app.cash.turbine.test
import com.example.app.data.ApiFailure
import com.example.app.data.TodoDataSource
import com.example.generated.model.Todo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class TodoListViewModelTest {
    private val dispatcher = StandardTestDispatcher()

    @Before fun setUp() = Dispatchers.setMain(dispatcher)
    @After fun tearDown() = Dispatchers.resetMain()

    @Test fun `loads todos into Content`() = runTest(dispatcher) {
        val repo = FakeTodoRepository(listOf(Todo(id = "1", title = "A", completed = false)))
        val vm = TodoListViewModel(repo)

        vm.state.test {
            assertEquals(TodoListUiState.Loading, awaitItem())
            val content = awaitItem() as TodoListUiState.Content
            assertEquals(listOf("A"), content.todos.map { it.title })
        }
    }

    @Test fun `network failure becomes retryable Error`() = runTest(dispatcher) {
        val vm = TodoListViewModel(FakeTodoRepository(failure = ApiFailure.Network(java.io.IOException("offline"))))

        vm.state.test {
            awaitItem() // Loading
            val error = awaitItem() as TodoListUiState.Error
            assertTrue(error.retryable)
        }
    }
}

/** Fake behind the `TodoDataSource` seam (§4) — no mocking library, no network. */
private class FakeTodoRepository(
    todos: List<Todo> = emptyList(),
    private val failure: ApiFailure? = null,
) : TodoDataSource {
    private val todos = todos.toMutableList()

    override suspend fun list(): List<Todo> = failure?.let { throw it } ?: todos.toList()
    override suspend fun get(id: String): Todo = todos.firstOrNull { it.id == id } ?: throw ApiFailure.NotFound()
    override suspend fun create(title: String): Todo =
        Todo(id = "new-${todos.size + 1}", title = title, completed = false).also { todos += it }
    override suspend fun toggle(id: String): Todo {
        val index = todos.indexOfFirst { it.id == id }
        if (index < 0) throw ApiFailure.NotFound()
        return todos[index].copy(completed = !todos[index].completed).also { todos[index] = it }
    }
    override suspend fun delete(id: String) { todos.removeAll { it.id == id } }
}
```

---

## §11. Compose UI test + Maestro flow

```kotlin
// app/src/androidTest/java/com/example/app/ui/todos/TodoListContentTest.kt
@RunWith(AndroidJUnit4::class)
class TodoListContentTest {
    @get:Rule val compose = createComposeRule()

    @Test fun errorStateShowsRetry() {
        var retried = false
        compose.setContent {
            TodoListContent(
                state = TodoListUiState.Error("Offline"),
                onRetry = { retried = true }, onToggle = {}, onOpenDetail = {},
            )
        }
        compose.onNodeWithText("Retry").performClick()
        assertTrue(retried)
    }
}
```

```yaml
# e2e/todo_list.yaml  (Maestro) — drives the §6 screen against a backend seeded with "Buy milk"
appId: com.example.app
---
- launchApp
- assertVisible: "Todos"              # TopAppBar title
- extendedWaitUntil:
    visible: "Buy milk"               # ListItem headline once the list loads
    timeout: 10000
- assertNotVisible: "Retry"           # not the error state
- tapOn: "Buy milk"                   # row click → onOpenDetail (§7)
```

---

## §12. Secrets: Keystore-backed token storage (never plain `SharedPreferences`)

```kotlin
// app/src/main/java/com/example/app/data/auth/TokenStore.kt
package com.example.app.data.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

data class Tokens(val access: String, val refresh: String)

/**
 * AES-256-GCM key held in the Android Keystore; only ciphertext reaches `SharedPreferences`.
 * `androidx.security:security-crypto` (`EncryptedSharedPreferences`, `MasterKey`) is deprecated
 * upstream in favour of this direct Keystore use — keep it only where a project already ships it.
 */
@Singleton
class TokenStore @Inject constructor(@ApplicationContext ctx: Context) {
    private val prefs = ctx.getSharedPreferences("auth", Context.MODE_PRIVATE)

    fun current(): Tokens? {
        val access = read("access") ?: return null
        val refresh = read("refresh") ?: return null
        return Tokens(access, refresh)
    }

    fun save(tokens: Tokens) = prefs.edit()
        .putString("access", encrypt(tokens.access))
        .putString("refresh", encrypt(tokens.refresh))
        .apply()

    fun clear() = prefs.edit().clear().apply()

    /** Called by Ktor's Auth plugin (§3) on 401; perform the refresh through the generated AuthApi. */
    suspend fun refresh(): Tokens? = null // TODO: wire to AuthApi.refreshToken(); return null to force re-login

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE).apply { init(spec) }.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val sealed = cipher.iv + cipher.doFinal(plain.toByteArray(Charsets.UTF_8))   // Keystore-generated IV prefix
        return Base64.encodeToString(sealed, Base64.NO_WRAP)
    }

    /** Null when absent or undecryptable (key invalidated, prefs restored without the key) → re-login. */
    private fun read(name: String): String? {
        val sealed = prefs.getString(name, null)?.let { Base64.decode(it, Base64.NO_WRAP) } ?: return null
        return runCatching {
            val cipher = Cipher.getInstance(TRANSFORMATION).apply {
                init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, sealed, 0, IV_BYTES))
            }
            String(cipher.doFinal(sealed, IV_BYTES, sealed.size - IV_BYTES), Charsets.UTF_8)
        }.getOrNull()
    }

    private companion object {
        const val KEYSTORE = "AndroidKeyStore"
        const val KEY_ALIAS = "auth_tokens"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_BYTES = 12
    }
}
```

Tokens never enter Room, plain DataStore or `SharedPreferences`, or logs. The Ktor `Auth` plugin in §3 reads from this store so no call site attaches headers manually.
