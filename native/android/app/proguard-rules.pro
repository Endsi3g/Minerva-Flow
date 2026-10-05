# kotlinx.serialization keeps its generated serializers; models are @Serializable data classes.
-keepattributes *Annotation*, InnerClasses
-keepclassmembers class com.minervaflow.loyalty.data.** { *** Companion; }
-keep,includedescriptorclasses class com.minervaflow.loyalty.data.**$$serializer { *; }
