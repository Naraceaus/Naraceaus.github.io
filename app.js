export default {
    data() {
        return {
            openTab:'',
            productStore:-1,
            products:{},
            recipes:{},
            stores:{},
            storesOrder:[],
            inputFocus:""
        }
    },
    mounted() {
        this.loadData();

    },
    updated() {
        if (this.inputFocus != "") {
            document.getElementById(this.inputFocus).focus();
            this.inputFocus = "";
        }
    },
    computed:{
        storesOrderOnList() {
            let _this = this;
            return this.storesOrder.filter((element, index, array) => {
                return _this.stores[element].onlist;
            })
        },
        productNameLookup() {
            let productNames = {};
            for (let prodkey in this.products) {
                productNames[this.products[prodkey].name] = prodkey;
            }
            return productNames;
        },
        recipesOnList() {
            let recipelist = {};
            for (let reckey in this.recipes) {
                recipelist[reckey] = {
                    all:Object.keys(this.recipes[reckey].products).length>0,
                    none:true
                }

                for (let prodkey in this.recipes[reckey].products) {
                    if (this.recipes[reckey].products[prodkey].onlist) {
                        recipelist[reckey].none = false;
                    } else {
                        recipelist[reckey].all = false;
                    }
                }
            }
            return recipelist;
        },
        shoppingList() {
            let locToProductsMap = {"-1":{
                "-1":[]
            }};
            //prefill map so I don't have to check for blanks later
            for (let stki in this.storesOrderOnList) {
                let storekey = this.storesOrderOnList[stki];
                locToProductsMap[storekey] = {}
                for (let aki in this.stores[storekey].aislesOrder) {
                    let aislekey = this.stores[storekey].aislesOrder[aki];
                    locToProductsMap[storekey][aislekey] = [];
                }
            }

            //add loose products to shopping list
            for (let prodkey in this.products) {
                if (this.products[prodkey].onlist) {
                    let added = false;
                    for (let stki in this.storesOrderOnList) {
                        let storekey = this.storesOrderOnList[stki];
                        if (this.products[prodkey].aisles[storekey] >= 0) {
                            locToProductsMap[storekey][this.products[prodkey].aisles[storekey]].push({
                                prodkey:prodkey,
                                recprodkey:-1,
                                recKey:-1,
                                weekly:this.products[prodkey].weekly,
                                bought:this.products[prodkey].bought
                            });
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        //add under blank location at front of the list
                        locToProductsMap["-1"]["-1"].push({
                            prodkey:prodkey,
                            recprodkey:-1,
                            recKey:-1,
                            weekly:this.products[prodkey].weekly,
                            bought:this.products[prodkey].bought
                        });
                    }
                }
            }

            //add recipe products to shipping list
            for (let reckey in this.recipes) {
                for (let recprodkey in this.recipes[reckey].products) {
                    let recprod = this.recipes[reckey].products[recprodkey];
                    let prodkey = recprod.prodkey;
                    this.products[prodkey];
                    if (recprod.onlist) {
                        let added = false;
                        for (let stki in this.storesOrderOnList) {
                            let storekey = this.storesOrderOnList[stki];                            
                            if (this.products[prodkey].aisles[storekey] >= 0) {
                                locToProductsMap[storekey][this.products[prodkey].aisles[storekey]].push({
                                    prodkey:prodkey,
                                    recprodkey:recprodkey,
                                    recKey:reckey,
                                    weekly:false,
                                    bought:recprod.bought
                                });
                                //if we don't break products will be added to aisle for every store they have
                                added = true;
                                break;
                            }   
                        }
                        if (!added) {
                            //add under blank location at front of the list
                            locToProductsMap["-1"]["-1"].push({
                                prodkey:prodkey,
                                recprodkey:recprodkey,
                                recKey:reckey,
                                weekly:false,
                                bought:recprod.bought
                            });
                        }
                    }
                }
            }

            // sort each aisle by name so duplicates clump together.
            for (let stki in this.storesOrderOnList) {
                let storekey = this.storesOrderOnList[stki];
                for (let aki in this.stores[storekey].aislesOrder) {
                    let aislekey = this.stores[storekey].aislesOrder[aki];
                    let _this = this;
                    locToProductsMap[storekey][aislekey].sort(function (a,b) {
                        return sortAlphabetical(_this.products[a.prodkey].name, _this.products[b.prodkey].name);
                    })
                }
            }

            console.log('boop');
            console.log(locToProductsMap);

            return locToProductsMap;


        }
    },
    methods: {
        saveData() {
            let data = {};
            for (const field of saveFields) {
                data[field] = this[field];
            }
            localStorage.setItem("listData", JSON.stringify(data));
        },
        loadData() {
            let dataText = localStorage.getItem("listData");
            if (dataText!= null) {
                try {
                    let data = JSON.parse(dataText);
                    for (const field of saveFields) {
                        if (data[field] != undefined) {
                            this[field] = data[field];
                        }
                    }
                } catch (error){
                    console.log(error);
                }
            }
        },
        newStore() {
            
            let newID = Math.max.apply(null,Object.keys(this.stores).concat([-1]))+1;
            this.storesOrder.push(newID);
            this.stores[newID] = {
                name:"",
                suburb:"",
                aisles:{},
                aislesOrder:[],
                expand:false,
                onlist:true
            }
            this.inputFocus = "store_"+newID;
        },
        deleteStore(key) {
            //TODO delete aisle from products for store
            if (this.productStore == key) {
                this.productStore = -1;
            }
            this.storesOrder.splice(this.storesOrder.indexOf(key),1)
            delete this.stores[key];
        },
        expandStore(key) {
            this.stores[key].expand = true;
        },
        collapseStore(key) {
            this.stores[key].expand = false;
        },
        moveStore(storekey, direction) {
            let curIndex = this.storesOrder.indexOf(storekey);
            let newIndex = curIndex + direction;
            if (newIndex >= 0 && newIndex < this.storesOrder.length) {
                let swapStoreKey = this.storesOrder[newIndex];
                this.storesOrder[curIndex] = swapStoreKey;
                this.storesOrder[newIndex ] = storekey;
            }
        },
        newAisle(storekey) {
            let newID = Math.max.apply(null,Object.keys(this.stores[storekey].aisles).concat([-1]))+1;
            this.stores[storekey].aislesOrder.push(newID);
            this.stores[storekey].aisles[newID] = {
                name:"",
                priority:""
            }
            

            this.inputFocus = "aisle_"+storekey+"_"+newID;


        },
        deleteAisle(storekey, aislekey) {
            //TODO delete aisle from products

            this.stores[storekey].aislesOrder.splice(this.stores[storekey].aislesOrder.indexOf(aislekey),1)
            delete this.stores[storekey].aisles[aislekey];
        },
        moveAisle(storekey, aislekey, direction) {
            let curIndex = this.stores[storekey].aislesOrder.indexOf(aislekey);
            let newIndex = curIndex + direction;
            if (newIndex >= 0 && newIndex < this.stores[storekey].aislesOrder.length) {
                let swapAislekey = this.stores[storekey].aislesOrder[curIndex + direction];
                this.stores[storekey].aislesOrder[curIndex] = swapAislekey;
                this.stores[storekey].aislesOrder[newIndex ] = aislekey;
            }
        },
        addProduct(name="",autofocus = true) {
            let newID = Math.max.apply(null,Object.keys(this.products).concat([-1]))+1;
            this.products[newID] = {
                name:name,
                aisles:{},
                weekly:false,
                onlist:false,
                bought:false
            }
            if (autofocus) {
                this.inputFocus = "product_"+newID;
            }

            return newID;
            
        },
        deleteProduct(prodid) {
            //todo delete product from recipes
            for (let reckey in this.recipes) {

                for (let prodkey in this.recipes[reckey].products) {
                    if (this.recipes[reckey].products[prodkey].prodkey == prodid) {
                        delete this.recipes[reckey].products[prodkey];
                    }
                }
            }

            delete this.products[prodid];
        },
        newRecipe() {
            let newID = Math.max.apply(null,Object.keys(this.recipes).concat([-1]))+1;
            this.recipes[newID] = {
                name:"",
                products:{},
                expand:false
            }
            this.inputFocus = "recipe_"+newID;
        },
        deleteRecipe(reckey) {
            delete this.recipes[reckey];
        },
        addRecipeProduct(reckey, event) {
            let productID = -1;
            let prodName = event.target.value;
            if (prodName != "") {
                if (this.productNameLookup[prodName] !== undefined) {
                    productID = this.productNameLookup[prodName];
                } else {
                    productID = this.addProduct(prodName, false);
                }

                let newID = Math.max.apply(null,Object.keys(this.recipes[reckey].products).concat([-1]))+1;
                this.recipes[reckey].products[newID] = {
                    prodkey:productID,
                    onlist:false,
                    bought:false
                }   


                event.target.value = "";
                this.inputFocus = "recipe_new_product_"+reckey;
            }

        },
        deleteRecipeProduct(reckey, prodkey){
            delete this.recipes[reckey].products[prodkey];
        },
        toggleRecipeProduct(reckey, prodkey) {
            this.recipes[reckey].products[prodkey].onlist = !this.recipes[reckey].products[prodkey].onlist;
        },
        recipeOnList(reckey, onlist) {
            for (let prodkey in this.recipes[reckey].products) {
                this.recipes[reckey].products[prodkey].onlist = onlist;
            }
        }
    }
}

const saveFields = [
    "openTab",
    "productStore",
    "products",
    "recipes",
    "stores",
    "storesOrder",
    "inputFocus"
];

function sortAlphabetical(a,b) {
    const nameA = a.toUpperCase(); // ignore upper and lowercase
    const nameB = b.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
        return -1;
    }
    if (nameA > nameB) {
        return 1;
    }

    // names must be equal
    return 0;
}