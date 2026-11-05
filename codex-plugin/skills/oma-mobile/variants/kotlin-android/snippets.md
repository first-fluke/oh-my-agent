# Mobile Agent - Code Snippets (Kotlin Android Native)

Copy-paste ready patterns. Use these as starting points; adapt package names, module names, and versions to the specific project.
Always cache decoded domain models at the Repository layer — never in a Ktor plugin or an OkHttp interceptor.

Package placeholder: `com.example.app`. Generated packages: `com.example.generated.{api,model,infrastructure}`.

---

## §1. Gradle wiring: OpenAPI Generator (`kotlin` / `jvm-ktor`) + Ktor + OkHttp engine

```kotlin
// settings.gradle.kts
rootProject.name = "ExampleApp"
include(":app", ":api-client")
```

```kotlin
// build.gradle.kts (root) — pin every plugin version once, apply per module
plugins {
    id("com.android.application") version "8.9.2" apply false
    id("org.jetbrains.kotlin.android") version "2.1.20" apply false
    id("org.jetbrains.kotlin.jvm") version "2.1.20" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.20" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.20" apply false
    id("com.google.devtools.ksp") version "2.1.20-1.0.32" apply false
    id("com.google.dagger.hilt.android") version "2.56.2" apply false
    id("org.openapi.generator") version "7.26.0" apply false   // exact pin; never a range
}
```

```kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("org.openapi.generator")
}

android {
    namespace = "com.example.app"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.example.app"
        minSdk = 26
        targetSdk = 35
        buildConfigField("String", "API_BASE_URL",
            "\"${providers.gradleProperty("apiBaseUrl").orElse("http://10.0.2.2:8000").get()}\"")
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":api-client"))

    val composeBom = platform("androidx.compose:compose-bom:2025.04.01")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.0")
    implementation("androidx.navigation:navigation-compose:2.9.0")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    implementation("com.google.dagger:hilt-android:2.56.2")
    ksp("com.google.dagger:hilt-compiler:2.56.2")

    implementation("androidx.room:room-runtime:2.7.1")
    implementation("androidx.room:room-ktx:2.7.1")
    ksp("androidx.room:room-compiler:2.7.1")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")

    // Ktor: the generated client needs core + JSON; the ENGINE is this module's choice.
    implementation("io.ktor:ktor-client-core:3.1.3")
    implementation("io.ktor:ktor-client-okhttp:3.1.3")               // engine on device
    implementation("io.ktor:ktor-client-content-negotiation:3.1.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.3")
    implementation("io.ktor:ktor-client-auth:3.1.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("app.cash.turbine:turbine:1.2.0")
    testImplementation("io.ktor:ktor-client-mock:3.1.3")             // engine in tests
    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

// Pinned generator produces API/model/infrastructure sources from the committed server contract.
openApiGenerate {
    generatorName.set("kotlin")
    library.set("jvm-ktor")
    inputSpec.set(file("../../api/openapi.json").absolutePath)          // adapt to {api_spec}
    outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.absolutePath)
    apiPackage.set("com.example.generated.api")
    modelPackage.set("com.example.generated.model")
    invokerPackage.set("com.example.generated.infrastructure")
    packageName.set("com.example.generated")
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
    id("org.jetbrains.kotlin.jvm")
    id("org.jetbrains.kotlin.plugin.serialization")
}
kotlin {
    jvmToolchain(17)
    sourceSets.getByName("main").kotlin.srcDir("../app/build/generated/openapi/src/main/kotlin")
}
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.1")
    implementation("io.ktor:ktor-client-core:3.1.3")                 // no engine here on purpose
    implementation("io.ktor:ktor-client-content-negotiation:3.1.3")
    implementation("io.ktor:ktor-serialization-kotlinx-json:3.1.3")
    testImplementation("io.ktor:ktor-client-mock:3.1.3")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("junit:junit:4.13.2")
}
tasks.named("compileKotlin") { dependsOn(":app:openApiGenerate") }
```

Generate and run the contract tests without an emulator:

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
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.request.header
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

    /** Cross-cutting transport concerns only — auth, timeouts, headers, logging. Never caching. */
    @Provides @Singleton
    fun provideClientConfig(tokenStore: TokenStore): (HttpClientConfig<*>) -> Unit = { config ->
        config.expectSuccess = false              // generated HttpResponse<T>.success carries the status
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
     * One generated *Api per OpenAPI tag. The pinned jvm-ktor template exposes
     * `httpClientEngine` + `httpClientConfig` + `jsonSerializer` constructor hooks, so no
     * template fork is needed. Parameter names follow the pinned generator version —
     * confirm against build/generated/openapi/.../infrastructure/ApiClient.kt once.
     */
    @Provides @Singleton
    fun provideTodosApi(
        engine: HttpClientEngine,
        clientConfig: (HttpClientConfig<*>) -> Unit,
        json: Json,
    ): TodosApi = TodosApi(
        baseUrl = BuildConfig.API_BASE_URL.trimEnd('/'),
        httpClientEngine = engine,
        httpClientConfig = clientConfig,
        jsonSerializer = json,
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

/** Every HTTP operation is generated from the OpenAPI spec; this class owns mapping and errors only. */
@Singleton
class TodoRepository @Inject constructor(
    private val api: TodosApi,
    private val json: Json,
) {
    suspend fun list(): List<Todo> = call { api.listTodos() }
    suspend fun get(id: String): Todo = call { api.getTodo(id) }
    suspend fun create(title: String): Todo = call { api.createTodo(CreateTodoRequest(title = title)) }
    suspend fun toggle(id: String): Todo = call { api.toggleTodo(id) }
    suspend fun delete(id: String) { call { api.deleteTodo(id) } }

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

---

## §5. `@HiltViewModel` with a single `StateFlow<UiState>`

```kotlin
// app/src/main/java/com/example/app/ui/todos/TodoListViewModel.kt
package com.example.app.ui.todos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.app.data.ApiFailure
import com.example.app.data.TodoRepository
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
    private val repository: TodoRepository,
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

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
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

Screens receive callbacks, never the `NavController`. Enable predictive back once in `AndroidManifest.xml` (`android:enableOnBackInvokedCallback="true"`); the `NavHost` handles it.

---

## §8. Repository-layer response cache (Room, stale-while-revalidate)

```kotlin
// app/src/main/java/com/example/app/data/cache/TodoCache.kt
package com.example.app.data.cache

import androidx.room.*
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

@Database(entities = [TodoCacheRow::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun todoCache(): TodoCacheDao
}
```

```kotlin
// app/src/main/java/com/example/app/data/CachedTodoRepository.kt
package com.example.app.data

import com.example.app.data.cache.TodoCacheDao
import com.example.app.data.cache.TodoCacheRow
import com.example.generated.api.TodosApi
import com.example.generated.model.Todo
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.time.Duration.Companion.minutes
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart

/**
 * Reads: emit cached rows immediately, revalidate when stale, let Room re-emit.
 * Writes: hit the server, then upsert/delete the affected rows — never a blind refetch.
 * Cache key = operation ("listTodos") + params; TTL is explicit.
 */
@Singleton
class CachedTodoRepository @Inject constructor(
    private val api: TodosApi,
    private val dao: TodoCacheDao,
    private val remote: TodoRepository,            // §4 — owns HttpResponse unwrapping
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val ttl = 5.minutes.inWholeMilliseconds

    fun observeTodos(): Flow<List<Todo>> = dao.observeAll()
        .map { rows -> rows.map { it.toModel() } }
        .onStart { revalidateIfStale() }           // fire-and-forget inside the collector's scope

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
        Room.databaseBuilder(ctx, AppDatabase::class.java, "app.db").build()
    @Provides fun provideTodoCache(db: AppDatabase): TodoCacheDao = db.todoCache()
}
```

---

## §9. Generated-client contract test with `MockEngine` (`:api-client`, no Android)

```kotlin
// api-client/src/test/kotlin/com/example/client/GeneratedClientContractTest.kt
package com.example.client

import com.example.generated.api.TodosApi
import com.example.generated.model.CreateTodoRequest
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.*
import io.ktor.http.content.TextContent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class GeneratedClientContractTest {
    private val json = ApiJson.create()

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
        val api = TodosApi(baseUrl = "http://localhost", httpClientEngine = engine, jsonSerializer = json)

        val response = api.createTodo(CreateTodoRequest(title = "Buy milk"))

        assertTrue(response.success)
        assertEquals(201, response.status)
        assertEquals("Buy milk", response.body().title)
        assertTrue(sentBody.contains("\"title\":\"Buy milk\""))
        engine.close()
    }

    @Test fun `non-2xx is surfaced through success=false, not an exception`() = runTest {
        val engine = MockEngine { respond("""{"detail":"not found"}""", HttpStatusCode.NotFound) }
        val api = TodosApi(baseUrl = "http://localhost", httpClientEngine = engine, jsonSerializer = json)

        val response = api.getTodo("missing")

        assertFalse(response.success)
        assertEquals(404, response.status)
        engine.close()
    }
}
```

Because the engine is injected, this test exercises the *real* generated code path (URL building, serialization, response unwrapping) with zero network.

---

## §10. ViewModel unit test (`runTest` + fake repository + Turbine)

```kotlin
// app/src/test/java/com/example/app/ui/todos/TodoListViewModelTest.kt
package com.example.app.ui.todos

import app.cash.turbine.test
import com.example.app.data.ApiFailure
import com.example.app.data.TodoRepository
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

/** Repository is a concrete class; make it `open` or extract an interface seam for fakes. */
private class FakeTodoRepository(
    private val todos: List<Todo> = emptyList(),
    private val failure: ApiFailure? = null,
) : TodoRepository(api = error("unused"), json = error("unused")) {
    override suspend fun list(): List<Todo> = failure?.let { throw it } ?: todos
}
```

Prefer an interface (`TodoDataSource`) that both the real repository and the fake implement; the subclass trick above is the minimal seam when the project has not introduced one.

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
# e2e/todo_create.yaml  (Maestro)
appId: com.example.app
---
- launchApp
- assertVisible: "Todos"
- tapOn: "Add"
- inputText: "Buy milk"
- tapOn: "Save"
- assertVisible: "Buy milk"
```

---

## §12. Secrets: Keystore-backed token storage (never plain `SharedPreferences`)

```kotlin
// app/src/main/java/com/example/app/data/auth/TokenStore.kt
package com.example.app.data.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

data class Tokens(val access: String, val refresh: String)

@Singleton
class TokenStore @Inject constructor(@ApplicationContext ctx: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        ctx, "auth",
        MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun current(): Tokens? {
        val access = prefs.getString("access", null) ?: return null
        val refresh = prefs.getString("refresh", null) ?: return null
        return Tokens(access, refresh)
    }

    fun save(tokens: Tokens) = prefs.edit().putString("access", tokens.access).putString("refresh", tokens.refresh).apply()
    fun clear() = prefs.edit().clear().apply()

    /** Called by Ktor's Auth plugin (§3) on 401; perform the refresh through the generated AuthApi. */
    suspend fun refresh(): Tokens? = null // TODO: wire to AuthApi.refreshToken(); return null to force re-login
}
```

Tokens never enter Room, DataStore, or logs. The Ktor `Auth` plugin in §3 reads from this store so no call site attaches headers manually.
