export default {
    data() {
        return {
            openTab:'',
            productStore:-1,
            products:{},
            recipes:{},
            stores:{},
            storesOrder:[],
            inputFocus:"",
            saveScheduled:undefined,
            listimport:"",
            uploadedBackup:""
        }
    },
    mounted() {
        this.loadFromLocalStorage();
    },
    updated() {
        if (this.inputFocus != "") {
            document.getElementById(this.inputFocus).focus();
            this.inputFocus = "";
        }
        clearTimeout(this.saveScheduled);
        this.saveScheduled = setTimeout(this.saveData, 2000);
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
                productNames[this.products[prodkey].name.toLowerCase()] = prodkey;
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

            //add recipe products to shopping list
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


            return locToProductsMap;


        },
        autofillList() {
            let autolist = [];
            for (let prodkey in this.products) {
                autolist.push(this.products[prodkey].name.replace(/(^.)|( .)/g, x => x.toUpperCase()));
            }
            return autolist;
        },
        saveDataString() {
            console.log('genning save data');
            let data = {};
            for (const field in saveFields) {
                data[field] = this[field];
            }
            return JSON.stringify(data);
        },
        backupURL(_,oldURL) {
            if  (oldURL) {
                window.URL.revokeObjectURL(oldURL);
            }

            let json = this.saveDataString;
            const blob = new Blob([json], { type: 'text/json' });
            const url = window.URL.createObjectURL(blob);
/*
            const link = document.createElement('a')
            link.href = url
            link.click()

            window.URL.revokeObjectURL(url)

            link.remove();
*/
            return url;
        }
    },
    methods: {
        saveData() {

            localStorage.setItem("listData", this.saveDataString);
            console.log('data saved');
        },
        loadFromLocalStorage() {
            let dataText = localStorage.getItem("listData");
            this.loadData(dataText);
        },
        loadData(dataText) {
            if (dataText!= null) {
                //wipe fields first
                for (const field in saveFields) {
                    this[field] = JSON.parse(JSON.stringify(saveFields[field]));
                }


                try {
                    let data = JSON.parse(dataText);
                    for (const field in saveFields) {
                        if (data[field] != undefined) {
                            this[field] = data[field];
                        }
                    }
                } catch (error){
                    console.log(error);
                }
            }


        },
        loadDataFromBackup() {
            this.loadData(this.uploadedBackup);

            if (this.$refs.backupupload) {
                this.$refs.backupupload.value = "";
            }
            this.uploadedBackup = "";
            this.openTab = '';
        },
        uploadBackup(event) {
            console.log(event);
            const reader = new FileReader();
            let _this = this;
            reader.addEventListener("load", () => {
                // this will then display a text file
                _this.uploadedBackup = reader.result;
            });

            if (event.target.files[0]) {
                reader.readAsText(event.target.files[0]);
            } else {
                this.uploadedBackup = "";
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
            let newID = this.productNameLookup[name.toLowerCase()];
            if (newID == undefined) {
                newID = Math.max.apply(null,Object.keys(this.products).concat([-1]))+1;
                this.products[newID] = {
                    name:name.toLowerCase(),
                    aisles:{},
                    weekly:false,
                    onlist:false,
                    bought:false
                }
                if (autofocus) {
                    this.inputFocus = "product_"+newID;
                }

                
            } else {
                if (autofocus) {
                    // already have blank name product so autofocus to that blank input
                    document.getElementById("product_"+newID).focus();
                }

            }
            return newID;


            
        },
        deleteProduct(prodid, altid = "") {
            //todo delete product from recipes
            for (let reckey in this.recipes) {

                for (let recprodkey in this.recipes[reckey].products) {
                    if (this.recipes[reckey].products[recprodkey].prodkey == prodid) {
                        if (altid != "") {
                            this.recipes[reckey].products[recprodkey].prodkey = altid;
                        } else {
                            delete this.recipes[reckey].products[recprodkey];
                        }
                        
                    }
                }
            }

            delete this.products[prodid];
        },
        // whenever a product name is changed we have to check if it matches another product already and merge them
        removeDuplicateProduct(prodid) {
            let name = this.products[prodid].name.toLowerCase();
            let dupProdIDs = [];

            for (let prodkey in this.products) {
                if (name == this.products[prodkey].name.toLowerCase()) {
                    dupProdIDs.push(prodkey);
                }
            }

            let originalID = dupProdIDs[0];
            for (let i = 1; i < dupProdIDs.length; i++) {
                //change product links for recipes
                this.deleteProduct(dupProdIDs[i],originalID);
            }
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
        addRecipeProduct(reckey, event, oldreckprodkey="") {
            let prodName = event.target.value;

            if (prodName != "") {

                let productID = this.addProduct(prodName, false);


                if (oldreckprodkey != "") {
                    //update existing recipe product to link to different product (either existing or made on the fly)
                    let productID = this.addProduct(prodName, false);
                    this.recipes[reckey].products[oldreckprodkey].prodkey = productID;
                } else {
                    // make new record with relevant product
                    let newID = Math.max.apply(null,Object.keys(this.recipes[reckey].products).concat([-1]))+1;
                    this.recipes[reckey].products[newID] = {
                        prodkey:productID,
                        onlist:false,
                        bought:false
                    }

                    // auto focus to new rec product if this was a new rec product
                    event.target.value = "";
                    this.inputFocus = "recipe_new_product_"+reckey;
                }


            }

        },
        deleteRecipeProduct(reckey, prodkey){
            delete this.recipes[reckey].products[prodkey];
        },
        toggleRecipeProduct(reckey, prodkey) {
            this.recipes[reckey].products[prodkey].onlist = !this.recipes[reckey].products[prodkey].onlist;
        },
        recipeOnList(reckey, onlist) {
            for (let recprodkey in this.recipes[reckey].products) {
                this.recipes[reckey].products[recprodkey].onlist = onlist;
            }
        },
        clearShoppingList() {
            //clear recipe products
            for (let reckey in this.recipes) {
                for (let recprodkey in this.recipes[reckey].products) {
                    this.recipes[reckey].products[recprodkey].onlist = false;
                }
            }

            //clear products
            for (let prodkey in this.products) {
                this.products[prodkey].onlist = false;
            }
        
        },
        importShoppingList() {
            this.clearShoppingList();
            let importArray = this.listimport.split(/\r\n|\r|\n/g);
            for (let impkey in importArray) {
                
                if (importArray[impkey] != "") {
                    this.addProductToListByName(importArray[impkey]);
                }
            }
            this.listimport = "";
        },
        addProductToListByName(name) {
            let prodID = this.addProduct(name,false);
            this.products[prodID].onlist = true;
        }
    }
}





const saveFields = {
    openTab:'',
    productStore:-1,
    products:{},
    recipes:{},
    stores:{},
    storesOrder:[],
    inputFocus:"",
};

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