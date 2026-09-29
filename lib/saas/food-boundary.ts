import type {TenantContext} from "./tenant-context";
import {assertResourceTenant} from "./tenant-context";
export type FoodOwned={tenantId:string;restaurantId:string};
export function assertFoodAccess(ctx:TenantContext,resource:FoodOwned){assertResourceTenant(ctx,resource.tenantId)}
export function assertSameRestaurant(...resources:FoodOwned[]){
 const first=resources[0]; if(!first?.tenantId||!first.restaurantId)throw new Error("SAAS_FOOD_OWNERSHIP_REQUIRED");
 for(const resource of resources){if(resource.tenantId!==first.tenantId)throw new Error("SAAS_CROSS_TENANT_FOOD_RELATION");if(resource.restaurantId!==first.restaurantId)throw new Error("SAAS_CROSS_RESTAURANT_RELATION")}
 return first.restaurantId;
}
export function assertKitchenOrder(order:FoodOwned,event:FoodOwned){return assertSameRestaurant(order,event)}
