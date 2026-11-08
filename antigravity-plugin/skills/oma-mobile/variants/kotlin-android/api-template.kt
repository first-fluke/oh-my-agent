/**
 * API Repository Template for Mobile Agent (Kotlin Android Native)
 *
 * This file wraps the generated `TodosApi` produced by the OpenAPI Generator Gradle
 * plugin (`generatorName = "kotlin"`, `library = "jvm-ktor"`) from the committed
 * server contract (`{api_spec}`). It is the **only** place that calls the backend
 * API — never assemble URL paths or JSON bodies by hand for endpoints covered by
 * the OpenAPI spec.
 *
 * Dependencies (all generated into app/build/generated/openapi at `openApiGenerate`):
 *   - `…generated.api.TodosApi`              — one class per OpenAPI tag (`DefaultApi` when untagged)
 *   - `…generated.model.*`                   — kotlinx-serialization DTOs
 *   - `…generated.infrastructure.HttpResponse<T>` — `success`, `status`, `body()`, raw `response`
 *
 * Transport: the generated client talks to a Ktor `HttpClient`. Ktor is an
 * engine-agnostic API layer; the app injects the OkHttp engine (`ktor-client-okhttp`)
 * through Hilt and tests inject `MockEngine` (`ktor-client-mock`). This file never
 * references either engine.
 *
 * Caching: when caching is required, it is MANDATORY at this Repository layer via a
 * Room table of DECODED models (see snippets.md §8) — never an OkHttp `Cache` or a
 * Ktor `HttpCache` plugin. Reads emit cached rows then revalidate; writes upsert or
 * delete the affected rows after the server confirms.
 *
 * File layout (split into real files in production):
 *   api-client/src/main/kotlin/<pkg>/client/
 *     ApiJson.kt                   <- shared Json codec (BigDecimal contextual serializer)
 *   app/src/main/java/<pkg>/
 *     di/NetworkModule.kt          <- Ktor client + OkHttp engine → TodosApi (Hilt)
 *     di/DatabaseModule.kt         <- Room database + DAO providers
 *     data/ApiFailure.kt           <- typed failures surfaced to view models
 *     data/TodoRepository.kt       <- this file
 *     data/cache/TodoCache.kt      <- Room entity + DAO for the response cache
 */

// ---------------------------------------------------------------------------
// app/src/main/java/com/example/app/data/TodoRepository.kt
// ---------------------------------------------------------------------------

package com.example.app.data

import com.example.app.data.cache.TodoCacheDao
import com.example.app.data.cache.TodoCacheRow
import com.example.generated.api.TodosApi
import com.example.generated.infrastructure.HttpResponse
import com.example.generated.model.CreateTodoRequest
import com.example.generated.model.Todo
import io.ktor.client.statement.bodyAsText
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.time.Duration.Companion.minutes
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onStart
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Typed failures surfaced by [TodoRepository]. View models map these to user text. */
sealed class ApiFailure(message: String) : Exception(message) {
    class NotFound : ApiFailure("The requested todo was not found.")
    class Conflict(val detail: String) : ApiFailure(detail.ifBlank { "A todo with that title already exists." })
    class Unauthorized : ApiFailure("Session expired.")
    class Server(val status: Int) : ApiFailure("Unexpected server response: HTTP $status.")
    class Network(cause: Throwable) : ApiFailure(cause.message ?: "Network error") {
        init { initCause(cause) }
    }
}

/**
 * Interface seam the view models depend on, so the cached [TodoRepository] is
 * swappable for a fake in unit tests (no mocking library required).
 */
interface TodoDataSource {
    fun observeTodos(): Flow<List<Todo>>
    suspend fun createTodo(title: String): Todo
    suspend fun toggleTodo(id: String): Todo
    suspend fun deleteTodo(id: String)
}

/**
 * CRUD repository for the `/todos` resource.
 *
 * Depends on the generated [TodosApi] (constructed in `di/NetworkModule.kt` with the
 * OkHttp engine) and a Room [TodoCacheDao]. Inject through Hilt; never instantiate
 * in composables.
 *
 * Caching contract:
 *   - Reads emit DECODED cached rows first, then revalidate when older than [ttl].
 *   - Writes upsert/delete the affected rows after success so Room re-emits.
 */
@Singleton
class TodoRepository @Inject constructor(
    private val api: TodosApi,
    private val dao: TodoCacheDao,
    private val json: Json,
    private val clock: () -> Long = System::currentTimeMillis,
) : TodoDataSource {

    private val ttl = 5.minutes.inWholeMilliseconds

    // -- List (stale-while-revalidate) ---------------------------------------

    /**
     * Emits the cached list immediately (if present), then the freshly fetched
     * list once revalidation upserts into Room. With a warm cache a network
     * failure keeps the stale rows and is swallowed; with an empty cache the
     * failure propagates to the collector.
     */
    override fun observeTodos(): Flow<List<Todo>> = dao.observeAll()
        .map { rows -> rows.map { it.toModel() } }
        .onStart { revalidateIfStale() }

    private suspend fun revalidateIfStale() {
        val oldest = dao.oldestFetchedAt()
        if (oldest != null && clock() - oldest < ttl) return
        try {
            val fresh = call { api.listTodos() }
            dao.replaceAll(fresh.map { it.toRow(clock()) })
        } catch (failure: ApiFailure) {
            if (oldest == null) throw failure
        }
    }

    // -- Create ------------------------------------------------------------------

    override suspend fun createTodo(title: String): Todo {
        val created = call { api.createTodo(CreateTodoRequest(title = title)) }
        dao.upsert(created.toRow(clock()))
        return created
    }

    // -- Toggle ------------------------------------------------------------------

    override suspend fun toggleTodo(id: String): Todo {
        val updated = call { api.toggleTodo(id) }
        dao.upsert(updated.toRow(clock()))
        return updated
    }

    // -- Delete ------------------------------------------------------------------

    override suspend fun deleteTodo(id: String) {
        call { api.deleteTodo(id) }
        dao.delete(id)
    }

    // -- Generated-response unwrapping ---------------------------------------------

    /**
     * Unwraps the generated [HttpResponse]: non-2xx becomes a typed [ApiFailure],
     * transport `IOException` becomes [ApiFailure.Network], cancellation is rethrown.
     * `expectSuccess = false` is set on the client so Ktor never throws on status.
     */
    private suspend fun <T> call(request: suspend () -> HttpResponse<T>): T {
        val response = try {
            request()
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (io: IOException) {
            throw ApiFailure.Network(io)
        }
        if (!response.success) {
            val detail = runCatching {
                json.parseToJsonElement(response.response.bodyAsText())
                    .jsonObject["detail"]?.jsonPrimitive?.content
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

private fun TodoCacheRow.toModel() = Todo(id = id, title = title, completed = completed)
private fun Todo.toRow(now: Long) = TodoCacheRow(id = id, title = title, completed = completed, fetchedAt = now)
