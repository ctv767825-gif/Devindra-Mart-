// admin.js
import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);

const refs = {
  categories: collection(db, "categories"),
  products: collection(db, "products"),
  promos: collection(db, "promos"),
  settings: collection(db, "settings")
};

async function addCategory() {
  const payload = {
    name: $("catName").value.trim(),
    subcategory: $("catSubcategory").value.trim(),
    support: $("catSupport").value.trim() || "7678256489",
    image: $("catImage").value.trim() || "https://via.placeholder.com/300x180?text=Category",
    actionType: $("catAction").value.trim() || "whatsapp",
    createdAt: serverTimestamp()
  };

  if (!payload.name) return alert("Category name daalo");
  await addDoc(refs.categories, payload);
  clearCategoryForm();
  await loadCategories();
  alert("Category added ✅");
}

async function addProduct() {
  const payload = {
    name: $("prodName").value.trim(),
    category: $("prodCategory").value.trim(),
    subcategory: $("prodSubcategory").value.trim(),
    price: Number($("prodPrice").value || 0),
    image: $("prodImage").value.trim() || "https://via.placeholder.com/300x180?text=Product",
    stock: $("prodStock").value.trim() || "In Stock",
    createdAt: serverTimestamp()
  };

  if (!payload.name || !payload.category || !payload.price) {
    return alert("Product name, category aur price daalo");
  }
  await addDoc(refs.products, payload);
  clearProductForm();
  await loadProducts();
  alert("Product added ✅");
}

async function saveSettings() {
  const docs = await getDocs(refs.settings);
  const payload = {
    storeName: $("storeName").value.trim(),
    tagline: $("tagline").value.trim(),
    noticeText: $("noticeText").value.trim(),
    whatsappNumber: $("whatsappNumber").value.trim() || "7678256489",
    supportNumber: $("supportNumber").value.trim() || "7678256489",
    minOrder: Number($("minOrder").value || 500),
    delivery0to999: Number($("delivery0to999").value || 50),
    delivery1000to2999: Number($("delivery1000to2999").value || 30),
    delivery3000to4999: Number($("delivery3000to4999").value || 20),
    delivery5000plus: Number($("delivery5000plus").value || 10),
    storeMapLink: $("storeMapLink").value.trim(),
    updatedAt: serverTimestamp()
  };

  if (docs.empty) {
    await addDoc(refs.settings, payload);
  } else {
    await updateDoc(doc(db, "settings", docs.docs[0].id), payload);
  }
  alert("Settings saved ✅");
}

async function loadCategories() {
  const snap = await getDocs(refs.categories);
  const wrap = $("categoriesList");
  wrap.innerHTML = "";
  snap.forEach((d) => {
    const item = d.data();
    const row = document.createElement("div");
    row.className = "row-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name || "")}</strong>
        <div class="meta">${escapeHtml(item.subcategory || "")} • ${escapeHtml(item.support || "")}</div>
      </div>
      <button data-id="${d.id}" class="danger small">Delete</button>
    `;
    row.querySelector("button").onclick = async () => {
      await deleteDoc(doc(db, "categories", d.id));
      await loadCategories();
    };
    wrap.appendChild(row);
  });
}

async function loadProducts() {
  const snap = await getDocs(refs.products);
  const wrap = $("productsList");
  wrap.innerHTML = "";
  snap.forEach((d) => {
    const item = d.data();
    const row = document.createElement("div");
    row.className = "row-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name || "")}</strong>
        <div class="meta">${escapeHtml(item.category || "")}${item.subcategory ? " / " + escapeHtml(item.subcategory) : ""} • ₹${Number(item.price || 0)}</div>
      </div>
      <button data-id="${d.id}" class="danger small">Delete</button>
    `;
    row.querySelector("button").onclick = async () => {
      await deleteDoc(doc(db, "products", d.id));
      await loadProducts();
    };
    wrap.appendChild(row);
  });
}

async function loadSettings() {
  const snap = await getDocs(refs.settings);
  if (snap.empty) return;
  const s = snap.docs[0].data();
  $("storeName").value = s.storeName || "";
  $("tagline").value = s.tagline || "";
  $("noticeText").value = s.noticeText || "";
  $("whatsappNumber").value = s.whatsappNumber || "7678256489";
  $("supportNumber").value = s.supportNumber || "7678256489";
  $("minOrder").value = s.minOrder ?? 500;
  $("delivery0to999").value = s.delivery0to999 ?? 50;
  $("delivery1000to2999").value = s.delivery1000to2999 ?? 30;
  $("delivery3000to4999").value = s.delivery3000to4999 ?? 20;
  $("delivery5000plus").value = s.delivery5000plus ?? 10;
  $("storeMapLink").value = s.storeMapLink || "";
}

function clearCategoryForm() {
  ["catName", "catSubcategory", "catSupport", "catImage", "catAction"].forEach((id) => $(id).value = "");
}
function clearProductForm() {
  ["prodName", "prodCategory", "prodSubcategory", "prodPrice", "prodImage", "prodStock"].forEach((id) => $(id).value = "");
}
function escapeHtml(v) {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

window.addEventListener("DOMContentLoaded", async () => {
  $("addCategoryBtn").onclick = addCategory;
  $("addProductBtn").onclick = addProduct;
  $("saveSettingsBtn").onclick = saveSettings;
  await Promise.all([loadCategories(), loadProducts(), loadSettings()]);
});
