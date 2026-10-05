package com.minervaflow.loyalty.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.minervaflow.loyalty.MinervaApp
import com.minervaflow.loyalty.data.CounterCustomer
import com.minervaflow.loyalty.data.CounterResult
import com.minervaflow.loyalty.data.DeleteOutcome
import com.minervaflow.loyalty.data.LookupHit
import com.minervaflow.loyalty.data.OrderStatus
import com.minervaflow.loyalty.data.OwnerCustomer
import com.minervaflow.loyalty.data.OwnerMenuItem
import com.minervaflow.loyalty.data.OwnerOrder
import com.minervaflow.loyalty.data.OwnerOverview
import com.minervaflow.loyalty.data.OwnerRestaurant
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class OwnerTab { Overview, Orders, Menu, Loyalty, Account }

data class OwnerUiState(
    val restaurants: List<OwnerRestaurant> = emptyList(),
    val selectedId: String = "",
    val tab: OwnerTab = OwnerTab.Overview,
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val error: Boolean = false,
    val overview: OwnerOverview? = null,
    val orders: List<OwnerOrder> = emptyList(),
    val menu: List<OwnerMenuItem> = emptyList(),
    val customers: List<OwnerCustomer> = emptyList(),
    val orderFilter: String? = null,
    val customerSearch: String = "",
) {
    val selected: OwnerRestaurant? get() = restaurants.firstOrNull { it.id == selectedId }
    val ordersToHandle: Int get() = orders.count { it.status in OrderStatus.toHandle }
    val visibleOrders: List<OwnerOrder> get() = if (orderFilter == null) orders else orders.filter { it.status == orderFilter }
}

class OwnerViewModel(application: Application) : AndroidViewModel(application) {
    private val container = (application as MinervaApp).container
    private val repo = container.ownerRepository

    private val _state = MutableStateFlow(OwnerUiState())
    val state: StateFlow<OwnerUiState> = _state.asStateFlow()
    private var searchJob: Job? = null

    /** Called whenever the signed-in owner's restaurants are known; a different account starts clean. */
    fun start(restaurants: List<OwnerRestaurant>) {
        val current = _state.value
        if (restaurants.map { it.id } == current.restaurants.map { it.id } && current.selectedId.isNotEmpty()) return
        _state.value = OwnerUiState(restaurants = restaurants, selectedId = restaurants.firstOrNull()?.id.orEmpty())
        load()
    }

    fun selectTab(tab: OwnerTab) = _state.update { it.copy(tab = tab) }
    fun setOrderFilter(status: String?) = _state.update { it.copy(orderFilter = status) }

    fun selectRestaurant(id: String) {
        if (id == _state.value.selectedId) return
        _state.update { it.copy(selectedId = id, loading = true, overview = null, orders = emptyList(), menu = emptyList(), customers = emptyList(), customerSearch = "") }
        load()
    }

    fun refresh() = load(refreshing = true)

    fun load(refreshing: Boolean = false) {
        val id = _state.value.selectedId
        if (id.isEmpty()) return
        _state.update { it.copy(loading = !refreshing && it.overview == null, refreshing = refreshing, error = false) }
        viewModelScope.launch {
            var failed = false
            coroutineScope {
                val overview = async { runCatching { repo.overview(id) }.onFailure { failed = true }.getOrNull() }
                val orders = async { runCatching { repo.orders(id) }.onFailure { failed = true }.getOrNull() }
                val menu = async { runCatching { repo.menu(id) }.onFailure { failed = true }.getOrNull() }
                val customers = async { runCatching { repo.customers(id) }.onFailure { failed = true }.getOrNull() }
                val o = overview.await()
                val ord = orders.await()
                val m = menu.await()
                val c = customers.await()
                if (_state.value.selectedId == id) {
                    _state.update {
                        it.copy(
                            overview = o ?: it.overview,
                            orders = ord ?: it.orders,
                            menu = m ?: it.menu,
                            customers = c ?: it.customers,
                        )
                    }
                }
            }
            _state.update { it.copy(loading = false, refreshing = false, error = failed && it.overview == null) }
        }
    }

    /** Searches the customer list after a short pause so each keystroke does not hit the server. */
    fun searchCustomers(query: String) {
        _state.update { it.copy(customerSearch = query) }
        searchJob?.cancel()
        val id = _state.value.selectedId
        searchJob = viewModelScope.launch {
            delay(350)
            val found = runCatching { repo.customers(id, query) }.getOrNull() ?: return@launch
            if (_state.value.selectedId == id && _state.value.customerSearch == query) _state.update { it.copy(customers = found) }
        }
    }

    // ---- Actions ----------------------------------------------------------------------------------------

    suspend fun updateOrder(order: OwnerOrder, status: String): Boolean {
        val ok = repo.setOrderStatus(order.id, order.restaurantId, status)
        if (ok) runCatching { repo.orders(order.restaurantId) }.getOrNull()?.let { fresh -> _state.update { it.copy(orders = fresh) } }
        return ok
    }

    suspend fun setMenuItemActive(item: OwnerMenuItem, active: Boolean): Boolean {
        val id = _state.value.selectedId
        val ok = repo.setMenuItemActive(id, item, active)
        if (ok) _state.update { s -> s.copy(menu = s.menu.map { if (it.id == item.id) it.copy(active = active) else it }) }
        return ok
    }

    suspend fun staffNote(customerId: String) = repo.staffNote(customerId)

    suspend fun saveStaffNote(customerId: String, text: String): Boolean =
        repo.saveStaffNote(_state.value.selectedId, customerId, container.sessionStore.load()?.userId, text)

    suspend fun lookup(phone: String): List<LookupHit> = repo.lookupByPhone(_state.value.selectedId, phone)

    suspend fun confirm(customerId: String, code: String): CounterResult<CounterCustomer> =
        repo.confirmIdentity(_state.value.selectedId, customerId, code)

    suspend fun recordVisit(customerId: String, amount: Double): Boolean {
        val ok = repo.recordVisit(_state.value.selectedId, customerId, amount)
        if (ok) load(refreshing = true)
        return ok
    }

    suspend fun deleteAccount(): DeleteOutcome = repo.deleteAccount().also { if (it == DeleteOutcome.Deleted) container.sessionStore.clear() }
}
