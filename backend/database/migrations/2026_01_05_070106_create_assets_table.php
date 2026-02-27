<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_code')->nullable()->unique();

            // Relationships
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('category_id')->constrained();
            $table->foreignId('asset_type_id')->constrained('asset_types'); // table name explicit
            $table->foreignId('brand_id')->constrained();
            $table->foreignId('supplier_id')->constrained();

            // Asset Details
            $table->string('model_number');
            $table->string('serial_number')->nullable();
            $table->date('date_of_purchase');

            // Financials
            $table->decimal('acquisition_cost', 15, 2);
            $table->integer('useful_life_months');
            $table->decimal('monthly_depreciation', 15, 2);

            // Status & Attributes
            $table->enum('condition', ['good', 'fair', 'poor', 'obsolete']);
            $table->text('remarks')->nullable();
            $table->string('assigned_to')->nullable();
            $table->boolean('is_draft')->default(true);

            // Creator
            $table->foreignId('created_by')->constrained('users');

            // Deletion Request Flow
            $table->enum('delete_request_status', ['none', 'pending', 'approved', 'rejected'])->default('none');
            $table->foreignId('delete_requested_by')->nullable()->constrained('users');
            $table->timestamp('delete_requested_at')->nullable();
            $table->foreignId('delete_approved_by')->nullable()->constrained('users');
            $table->timestamp('delete_approved_at')->nullable();
            $table->text('delete_request_reason')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
