"""Mirrors lib/prospects/types.ts (ProspectMenu) exactly — keep the two in sync by hand,
there's no shared codegen between the Python and TypeScript sides."""

from typing import Literal, Optional
from pydantic import BaseModel, Field

DietaryTag = Literal[
    "vegan",
    "vegetarian",
    "gluten_free",
    "halal",
    "kosher",
    "spicy",
    "contains_nuts",
]

SourcePlatform = Literal[
    "uber_eats",
    "doordash",
    "skipthedishes",
    "direct_website",
    "raw_text",
    "other",
]


class ModifierOption(BaseModel):
    name: str
    additionalPriceCents: int = 0


class ModifierGroup(BaseModel):
    name: str
    minSelection: int = 0
    maxSelection: int = 1
    options: list[ModifierOption] = Field(default_factory=list)


class MenuItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    priceCents: int
    imageUrl: Optional[str] = None
    inStock: bool = True
    dietaryTags: list[DietaryTag] = Field(default_factory=list)
    modifierGroups: list[ModifierGroup] = Field(default_factory=list)


class MenuCategory(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    items: list[MenuItem] = Field(default_factory=list)


class ProspectMenu(BaseModel):
    categories: list[MenuCategory] = Field(default_factory=list)


class ScrapeRequest(BaseModel):
    url: str
    platform: SourcePlatform = "other"


class ScrapeSubmitResponse(BaseModel):
    job_id: str


class ScrapeStatusResponse(BaseModel):
    status: Literal["processing", "done", "failed"]
    menu: Optional[ProspectMenu] = None
    error: Optional[str] = None
