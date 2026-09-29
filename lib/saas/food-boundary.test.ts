import {describe,expect,it} from "vitest";
import {assertFoodAccess,assertKitchenOrder,assertSameRestaurant} from "./food-boundary";
import type {TenantContext} from "./tenant-context";
const ctx:TenantContext={tenantId:"ta",propertyId:null,membershipId:"ma",userId:"ua",role:"KITCHEN",source:"MEMBERSHIP"};
describe("food SaaS boundaries",()=>{
 it("accepts food resources owned by active tenant",()=>expect(()=>assertFoodAccess(ctx,{tenantId:"ta",restaurantId:"ra"})).not.toThrow());
 it("rejects another tenant restaurant",()=>expect(()=>assertFoodAccess(ctx,{tenantId:"tb",restaurantId:"rb"})).toThrow("SAAS_TENANT_BOUNDARY_VIOLATION"));
 it("rejects product/order relations crossing restaurants",()=>expect(()=>assertSameRestaurant({tenantId:"ta",restaurantId:"ra"},{tenantId:"ta",restaurantId:"rb"})).toThrow("SAAS_CROSS_RESTAURANT_RELATION"));
 it("rejects kitchen event from another tenant",()=>expect(()=>assertKitchenOrder({tenantId:"ta",restaurantId:"ra"},{tenantId:"tb",restaurantId:"ra"})).toThrow("SAAS_CROSS_TENANT_FOOD_RELATION"));
});
